/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';
import { SingleBar } from 'cli-progress';

// Minimum ms between speed samples / bar renders. Throttling keeps the ETA
// stable (each sample covers a meaningful slice of time) and avoids per-chunk
// render noise.
const RENDER_INTERVAL_MS = 500;

// How often to emit a plain-text progress line in non-TTY environments.
const LOG_PROGRESS_INTERVAL_MS = 5_000;

function isCiEnvironment() {
  return (process.env.CI ?? '').toLowerCase() === 'true';
}

/**
 * Returns true when stdout is an interactive terminal that can render an
 * in-place progress bar. False when stdout is piped (e.g. agents, CI redirects).
 */
function isInteractiveTty() {
  return Boolean(process.stdout.isTTY);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface DownloadProgress {
  /** Passthrough stream to place in the download pipeline; counts bytes seen. */
  meter: Transform;
  /** Stop and clear the progress bar. Always safe to call. */
  stop: () => void;
}

/**
 * Creates a passthrough Transform that tracks bytes received and drives a
 * `cli-progress` bar showing downloaded/total bytes, percentage and speed.
 *
 * In non-TTY environments (agents, CI, redirected output) it emits periodic
 * plain-text log lines via `logInfo` instead of an in-place bar so logs stay
 * readable. When `contentLength` is unknown only bytes-received and speed are
 * shown so the display is never falsely at 100%.
 */
export const createDownloadProgressBar = (
  contentLength: number | undefined,
  logInfo?: (msg: string) => void
): DownloadProgress => {
  const total = contentLength && contentLength > 0 ? contentLength : 0;

  let bytesReceived = 0;
  let lastTick = Date.now();
  let lastBytes = 0;

  if (!isInteractiveTty() || isCiEnvironment()) {
    const meter = new Transform({
      transform(chunk, _encoding, callback) {
        bytesReceived += chunk.length;

        const now = Date.now();
        const elapsed = now - lastTick;
        if (logInfo && elapsed >= LOG_PROGRESS_INTERVAL_MS) {
          const speed = elapsed > 0 ? ((bytesReceived - lastBytes) / elapsed) * 1000 : 0;
          lastTick = now;
          lastBytes = bytesReceived;

          const received = formatBytes(bytesReceived);
          const progress = total
            ? `${received} / ${formatBytes(total)} (${Math.round((bytesReceived / total) * 100)}%)`
            : received;
          const speedStr = speed > 0 ? ` at ${formatBytes(speed)}/s` : '';
          logInfo(`downloading: ${progress}${speedStr}`);
        }

        callback(null, chunk);
      },
    });

    return { meter, stop: () => {} };
  }

  // When content-length is known show percentage and a bar; otherwise show only
  // bytes-received and speed (position stays at 0 so it never reads 100%).
  const format = total
    ? ' downloading [{bar}] {percentage}% | {received} / {size} | {speed}/s | ETA: {eta_formatted}'
    : ' downloading {received} | {speed}/s';

  const bar = new SingleBar({
    barsize: 30,
    etaBuffer: 30,
    hideCursor: true,
    clearOnComplete: true,
    format,
  });

  bar.start(total || 1, 0, {
    received: formatBytes(0),
    size: total ? formatBytes(total) : '?',
    speed: '?',
  });

  const meter = new Transform({
    transform(chunk, _encoding, callback) {
      bytesReceived += chunk.length;

      const now = Date.now();
      const elapsed = now - lastTick;
      if (elapsed >= RENDER_INTERVAL_MS) {
        const speed = elapsed > 0 ? ((bytesReceived - lastBytes) / elapsed) * 1000 : 0;
        lastTick = now;
        lastBytes = bytesReceived;

        bar.update(total ? bytesReceived : 0, {
          received: formatBytes(bytesReceived),
          size: total ? formatBytes(total) : '?',
          speed: formatBytes(speed),
        });
      }

      callback(null, chunk);
    },
  });

  return {
    meter,
    stop: () => {
      // Snap the bar to the final byte count before clearing so a fast download
      // that never hit a render tick doesn't disappear stuck at 0%.
      bar.update(total ? bytesReceived : 0, {
        received: formatBytes(bytesReceived),
        size: total ? formatBytes(total) : '?',
      });
      bar.stop();
    },
  };
};
