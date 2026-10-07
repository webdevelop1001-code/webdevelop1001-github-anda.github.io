/**
 * FRESHDROP V1 — MILESTONE A: HTTPS deployment + camera capture test.
 * Flow: Open Camera -> Capture -> Preview -> Retake / Use Photo.
 * No scientific processing yet. The ?id=FD-P-001 parameter is only read and displayed.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const CONFIG = {
  tagIdPattern: /^FD-P-(0(0[1-9]|1[0-9]|2[0-4]))$/,
  // Tag is 50 x 30 mm -> guide aspect ratio 5:3
  guideAspect: 5 / 3,
}

type Stage = 'idle' | 'live' | 'preview' | 'accepted'

function readTagId(): { id: string | null; valid: boolean } {
  const id = new URLSearchParams(window.location.search).get('id')?.trim().toUpperCase() ?? null
  return { id, valid: !!id && CONFIG.tagIdPattern.test(id) }
}

function describeError(e: unknown): string {
  const err = e as DOMException
  switch (err?.name) {
    case 'NotAllowedError':
      return 'Camera permission was denied. Allow camera access in your browser settings, then try again.'
    case 'NotFoundError':
      return 'No camera was found on this device.'
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again.'
    case 'OverconstrainedError':
      return 'The requested camera settings are not supported on this device.'
    case 'SecurityError':
      return 'Camera is blocked in this context. The page must be served over HTTPS and not inside an iframe without camera permission.'
    default:
      return `Camera error: ${err?.name ?? 'unknown'} ${err?.message ?? ''}`
  }
}

export default function App() {
  const tag = readTagId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [info, setInfo] = useState<string>('')

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => stopCamera, [stopCamera])

  const openCamera = async () => {
    setError(null)
    if (!window.isSecureContext) {
      setError('This page is not served over HTTPS, so the camera is unavailable.')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access (getUserMedia).')
      return
    }
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      } catch (first) {
        if ((first as DOMException).name === 'NotAllowedError') throw first
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }) // fallback
      }
      streamRef.current = stream
      const s = stream.getVideoTracks()[0].getSettings()
      setInfo(`${s.width}×${s.height} · ${s.facingMode ?? 'facing unknown'}`)
      setStage('live')
    } catch (e) {
      setError(describeError(e))
    }
  }

  // attach the stream once the <video> element is mounted
  useEffect(() => {
    if (stage === 'live' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [stage])

  const capture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) {
      setError('Camera is not ready yet. Wait a moment and try again.')
      return
    }
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    setPhoto(c.toDataURL('image/jpeg', 0.95))
    setInfo(`${c.width}×${c.height} px captured`)
    stopCamera()
    setStage('preview')
  }

  const retake = () => {
    setPhoto(null)
    openCamera()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <header className="border-b border-line pb-4">
        <h1 className="text-2xl font-semibold tracking-[0.22em] text-burgundy">FRESHDROP</h1>
        <p className="mt-1 text-sm text-ink/70">Invisible Change → Visible Information</p>
        <div className="mt-4 flex items-center justify-between font-mono text-sm">
          <span>
            TAG: <b className="font-medium">{tag.valid ? tag.id : tag.id ? 'INVALID' : '—'}</b>
          </span>
          <span className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink/60">
            Milestone A · camera test
          </span>
        </div>
        {tag.id && !tag.valid && (
          <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            “{tag.id}” is not a valid Tag ID. Expected FD-P-001 to FD-P-024.
          </p>
        )}
        {!tag.id && (
          <p className="mt-3 text-xs text-ink/50">No ?id= in URL. Try adding ?id=FD-P-001</p>
        )}
      </header>

      <section className="flex flex-1 flex-col gap-4 py-5">
        <div>
          <h2 className="text-lg font-medium">Capture Initial Baseline</h2>
          <p className="mt-1 text-sm text-ink/70">
            Place the entire FreshDrop tag inside the guide. ACTIVE and R1–R4 must be visible.
          </p>
        </div>

        {stage === 'idle' && (
          <div className="flex flex-1 flex-col justify-center gap-3">
            <button
              onClick={openCamera}
              className="h-16 rounded-xl bg-burgundy text-base font-medium tracking-wide text-white active:opacity-80"
            >
              OPEN CAMERA
            </button>
            <p className="text-center text-xs text-ink/50">
              Your browser will ask for camera permission.
            </p>
          </div>
        )}

        {stage === 'live' && (
          <>
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} playsInline muted autoPlay className="block w-full" />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className="w-[84%] rounded-sm border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                  style={{ aspectRatio: CONFIG.guideAspect }}
                />
              </div>
              <span className="absolute bottom-2 left-0 right-0 text-center font-mono text-[11px] text-white/80">
                Tag 50 × 30 mm · fit inside frame
              </span>
            </div>
            <button
              onClick={capture}
              className="h-16 rounded-xl bg-burgundy text-base font-medium tracking-wide text-white active:opacity-80"
            >
              CAPTURE PHOTO
            </button>
          </>
        )}

        {(stage === 'preview' || stage === 'accepted') && photo && (
          <>
            <img src={photo} alt="Captured tag" className="w-full rounded-xl border border-line" />
            {stage === 'preview' ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={retake}
                  className="h-14 rounded-xl border border-burgundy font-medium text-burgundy active:bg-burgundy/10"
                >
                  RETAKE
                </button>
                <button
                  onClick={() => setStage('accepted')}
                  className="h-14 rounded-xl bg-burgundy font-medium text-white active:opacity-80"
                >
                  USE PHOTO
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-white p-4 text-sm">
                <p className="font-medium">Photo accepted ✓</p>
                <p className="mt-1 text-ink/60">
                  Camera test passed. Image analysis is not implemented in Milestone A.
                </p>
                <button
                  onClick={() => {
                    setPhoto(null)
                    setStage('idle')
                  }}
                  className="mt-3 text-burgundy underline"
                >
                  Start over
                </button>
              </div>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </section>

      <footer className="border-t border-line pt-3 font-mono text-[11px] text-ink/50">
        <div>secure context: {String(window.isSecureContext)}</div>
        <div>stream: {info || '—'}</div>
      </footer>
    </main>
  )
}
