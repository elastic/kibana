/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFile, writeFile } from 'fs/promises';
import { closeSync, openSync, writeSync } from 'fs';
import { Session } from 'node:inspector';
import Path from 'path';
import { PerformanceObserver, constants as perfConstants } from 'node:perf_hooks';
import * as tty from 'node:tty';
import v8 from 'v8';
import type { Logger } from '@kbn/logging';

/**
 * Memory profiling.
 *
 * When `KBN_MEM_PROFILE=1` (or `true`), or CLI `--mem-profile`, samples memory for 5 minutes,
 * logs each sample at debug on the `memory-profile` logger,
 * and appends each row to `kibana-memory-profile-<timestamp>.csv` in cwd.
 *
 * All stdout/stderr is redirected to `kibana-output-<timestamp>.log` in cwd so the terminal
 * is free to display a live memory chart (equivalent to `plot_memory_profile_csv.mjs`).
 *
 * Terminates kibana process automatically after 5 minutes of profiling.
 *
 * @example
 * ```
 * $ KBN_MEM_PROFILE=1 node scripts/kibana --dev --server.basePath="/kbn"
 * ```
 */

/**
 * A handle on the real interactive terminal (`/dev/tty`), independent of `process.stdout`.
 *
 * In Kibana's `--dev` mode this code runs in a child worker process whose stdout is a pipe
 * to the parent CLI, so `process.stdout.columns` / `.rows` are `undefined` and writing to
 * stdout (after our redirect) goes to the log file. Going through `/dev/tty` directly
 * lets us measure and draw on the user's actual terminal.
 */
interface TerminalHandle {
  readonly write: (s: string) => void;
  readonly columns: number;
  readonly rows: number;
  /**
   * Subscribe to terminal resize events (SIGWINCH). Returns an unsubscribe function.
   * The handler fires after `columns`/`rows` have been updated.
   */
  readonly onResize: (handler: () => void) => () => void;
  /**
   * Force a re-query of the current terminal dimensions. If they changed since the
   * last query, the underlying stream emits `'resize'` (which `onResize` subscribers
   * receive). Use as a fallback for environments where SIGWINCH isn't delivered to
   * this process (e.g. detached workers, some `--dev` cluster setups).
   */
  readonly refreshSize: () => void;
  readonly close: () => void;
}

/**
 * Internal: matches the private `_refreshSize` method exposed by `tty.WriteStream`.
 * Calling it re-queries window size via `getWindowSize` and emits `'resize'` if changed.
 */
type RefreshableStream = tty.WriteStream & { _refreshSize?: () => void };

const INTERVAL_MS = 500;
const DURATION_MS = 5 * 60 * 1000;
const SAMPLES = DURATION_MS / INTERVAL_MS;

// Fixed Y-axis range in bytes (900 MiB – 1400 MiB), matching plot_memory_profile_csv.mjs defaults.
const Y_AXIS_MIN_BYTES = 900 * 1024 * 1024;
const Y_AXIS_MAX_BYTES = 1_400 * 1024 * 1024;

const ANSI = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  /** Move cursor home + erase from cursor to end of screen (no scrollback impact in alt screen). */
  clearScreen: '\x1b[H\x1b[J',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
  /**
   * Switch to the alternate screen buffer (DECSET 1049). The previous screen contents
   * and cursor position are saved by the terminal, and our chart redraws happen here
   * with no scrollback accumulation. Pair with `exitAltScreen` on cleanup to restore.
   */
  enterAltScreen: '\x1b[?1049h',
  exitAltScreen: '\x1b[?1049l',
} as const;

interface ChartRow {
  readonly sequence: number;
  readonly heapUsed: number;
  readonly v8TotalHeap: number;
}

type SnapshotState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'running'; readonly seq: number; readonly path: string; readonly startedAt: number }
  | {
      readonly kind: 'done';
      readonly seq: number;
      readonly path: string;
      readonly bytes: number;
      readonly durationMs: number;
    }
  | { readonly kind: 'error'; readonly seq: number; readonly message: string };

const CSV_HEADER = [
  'sequence',
  'timestamp_ms',
  'rss',
  'heap_total',
  'heap_used',
  'external',
  'array_buffers',
  'v8_used_heap_size',
  'v8_total_heap_size',
  'v8_external_memory',
  'v8_malloced_memory',
  'v8_peak_malloced_memory',
  'v8_total_physical_size',
].join(',');

function formatGcKind(kind: number): string {
  switch (kind) {
    case perfConstants.NODE_PERFORMANCE_GC_INCREMENTAL:
      return 'incremental';
    case perfConstants.NODE_PERFORMANCE_GC_MINOR:
      return 'minor';
    case perfConstants.NODE_PERFORMANCE_GC_MAJOR:
      return 'major';
    case perfConstants.NODE_PERFORMANCE_GC_WEAKCB:
      return 'weakcb';
    default:
      return `kind_${kind}`;
  }
}

function isMemoryProfilingEnabled(): boolean {
  const raw = process.env.KBN_MEM_PROFILE?.trim();
  if (raw === '1' || raw?.toLowerCase() === 'true') {
    return true;
  }
  return process.argv.some((arg) => arg === '--mem-profile' || arg.startsWith('--mem-profile='));
}

interface SessionInfo {
  /** A short, filesystem-safe timestamp shared by every artefact of one profiling session (e.g. `2026-04-18T15.43`). */
  readonly timestamp: string;
  /** Working directory where all artefacts are written. */
  readonly cwd: string;
}

function resolveSessionInfoWhenEnabled(): SessionInfo | undefined {
  if (!isMemoryProfilingEnabled()) {
    return undefined;
  }
  return {
    timestamp: new Date().toISOString().slice(0, 16).replace(':', '.'),
    cwd: process.cwd(),
  };
}

function formatMib(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}M`;
}

/**
 * Opens `/dev/tty` (the controlling terminal) for writing and wraps it with `tty.WriteStream`
 * so we can read the live `columns`/`rows` and write synchronously, regardless of whether
 * `process.stdout` is a pipe (as in Kibana `--dev` cluster workers).
 *
 * Returns `undefined` if no controlling terminal is attached (CI, daemonized process, etc.).
 */
function openControllingTerminal(): TerminalHandle | undefined {
  let fd: number;
  try {
    fd = openSync('/dev/tty', 'w');
  } catch (_err) {
    return undefined;
  }

  let stream: RefreshableStream | undefined;
  try {
    stream = new tty.WriteStream(fd) as RefreshableStream;
  } catch (_err) {
    try {
      closeSync(fd);
    } catch (_ignored) {
      // already closed
    }
    return undefined;
  }

  const refreshSize = (): void => {
    // `_refreshSize` is a documented internal of tty.WriteStream. It calls the OS
    // `getWindowSize` syscall, updates `columns`/`rows`, and emits `'resize'` if changed.
    try {
      stream?._refreshSize?.();
    } catch (_ignored) {
      // best-effort
    }
  };

  // tty.WriteStream constructed from a custom fd is NOT wired up to SIGWINCH automatically
  // (only `process.stdout` is). Install our own handler so `'resize'` events fire on this
  // stream too. The no-op listener on `process` also ensures Node's SIGWINCH infrastructure
  // is initialized on older runtimes (see nodejs/node#16194).
  const sigwinchHandler = (): void => refreshSize();
  process.on('SIGWINCH', sigwinchHandler);

  let closed = false;

  return {
    write: (s: string): void => {
      // Silently no-op once closed: late callers (e.g. a setInterval tick that fires
      // after cleanup) would otherwise hit EBADF on the freed fd.
      if (closed) return;
      try {
        writeSync(fd, s);
      } catch (_ignored) {
        // best-effort: terminal may have been closed concurrently
      }
    },
    get columns(): number {
      return stream?.columns ?? 80;
    },
    get rows(): number {
      return stream?.rows ?? 24;
    },
    onResize: (handler: () => void): (() => void) => {
      if (closed || !stream) {
        return () => {};
      }
      stream.on('resize', handler);
      return () => {
        stream?.off('resize', handler);
      };
    },
    refreshSize,
    close: (): void => {
      if (closed) return;
      closed = true;
      process.off('SIGWINCH', sigwinchHandler);
      try {
        stream?.destroy();
      } catch (_ignored) {
        // best-effort
      }
      try {
        closeSync(fd);
      } catch (_ignored) {
        // already closed
      }
    },
  };
}

/**
 * Renders a full-terminal memory chart directly to the terminal (bypassing the file redirect),
 * mirroring the output of `plot_memory_profile_csv.mjs`.
 */
function formatSeq(seq: number): string {
  return seq.toString().padStart(3, '0');
}

function formatSnapshotStatus(status: SnapshotState): string {
  switch (status.kind) {
    case 'idle':
      return `${ANSI.dim}snap: idle${ANSI.reset}`;
    case 'running': {
      const elapsedSec = ((Date.now() - status.startedAt) / 1000).toFixed(1);
      return `${ANSI.cyan}snap ${formatSeq(status.seq)}: running ${elapsedSec}s${ANSI.reset}`;
    }
    case 'done':
      return (
        `${ANSI.bold}snap ${formatSeq(status.seq)}: done${ANSI.reset} ` +
        `${ANSI.dim}${formatMib(status.bytes)} ${(status.durationMs / 1000).toFixed(1)}s${ANSI.reset}`
      );
    case 'error':
      return `${ANSI.red}snap ${formatSeq(status.seq)}: error${ANSI.reset} ${ANSI.dim}${status.message}${ANSI.reset}`;
  }
}

function drawMemoryChart(
  rows: readonly ChartRow[],
  terminal: TerminalHandle,
  snapshotStatus: SnapshotState
): void {
  const labelCol = 9;
  // 1 line for header, 1 for x-axis, 1 for x-labels, 1 for status footer.
  const chartHeight = Math.max(1, terminal.rows - 5);
  const chartWidth = Math.max(10, terminal.columns - labelCol - 1);

  const visible = rows.length > chartWidth ? rows.slice(-chartWidth) : rows;

  const grid: string[][] = Array.from({ length: chartHeight }, () =>
    Array.from({ length: chartWidth }, () => ' ')
  );

  const scaleY = (value: number): number => {
    const clamped = Math.min(Y_AXIS_MAX_BYTES, Math.max(Y_AXIS_MIN_BYTES, value));
    const t = (Y_AXIS_MAX_BYTES - clamped) / (Y_AXIS_MAX_BYTES - Y_AXIS_MIN_BYTES);
    return Math.min(chartHeight - 1, Math.max(0, Math.round(t * (chartHeight - 1))));
  };

  for (let col = 0; col < visible.length; col++) {
    const sample = visible[col];
    const yh = scaleY(sample.heapUsed);
    const yv = scaleY(sample.v8TotalHeap);
    grid[yh][col] = '█';
    if (yv !== yh) {
      grid[yv][col] = '▒';
    }
  }

  const yAxisTickRowSet = new Set(
    [0, 1, 2, 3, 4].map((k) => Math.round((k / 4) * (chartHeight - 1)))
  );

  const yAxisLabelForRow = (row: number): string => {
    if (!yAxisTickRowSet.has(row)) return '';
    const t = chartHeight <= 1 ? 0 : row / (chartHeight - 1);
    const value = Y_AXIS_MAX_BYTES - (Y_AXIS_MAX_BYTES - Y_AXIS_MIN_BYTES) * t;
    return formatMib(value);
  };

  const lastRow = rows[rows.length - 1];
  const lastHeapUsed = lastRow?.heapUsed ?? NaN;
  const lastV8TotalHeap = lastRow?.v8TotalHeap ?? NaN;
  const maxHeapUsed = rows.reduce((acc, r) => Math.max(acc, r.heapUsed), lastHeapUsed);
  const maxV8TotalHeap = rows.reduce((acc, r) => Math.max(acc, r.v8TotalHeap), lastV8TotalHeap);

  const fmtStat = (bytes: number): string => (Number.isFinite(bytes) ? formatMib(bytes) : '—');

  const linesOut: string[] = [
    `${ANSI.bold}${ANSI.cyan}Memory profile${ANSI.reset} ` +
      `${ANSI.dim}|${ANSI.reset} ${rows.length}/${SAMPLES} sample(s) ` +
      `${ANSI.dim}|${ANSI.reset} ${ANSI.red}used ${ANSI.reset}${ANSI.dim}now/peak${ANSI.reset} ` +
      `${ANSI.red}${ANSI.bold}${fmtStat(lastHeapUsed)}${ANSI.reset}` +
      `${ANSI.dim}/${ANSI.reset}${ANSI.red}${ANSI.bold}${fmtStat(maxHeapUsed)}${ANSI.reset} ` +
      `${ANSI.dim}|${ANSI.reset} ${ANSI.yellow}total ${ANSI.reset}${ANSI.dim}now/peak${ANSI.reset} ` +
      `${ANSI.yellow}${ANSI.bold}${fmtStat(lastV8TotalHeap)}${ANSI.reset}` +
      `${ANSI.dim}/${ANSI.reset}${ANSI.yellow}${ANSI.bold}${fmtStat(maxV8TotalHeap)}${ANSI.reset}`,
  ];

  for (let y = 0; y < chartHeight; y++) {
    const tick = yAxisLabelForRow(y);
    const seqLabel = tick.padStart(labelCol - 1, ' ').slice(-(labelCol - 1));
    const cells = grid[y]
      .map((ch) => {
        if (ch === '█') return `${ANSI.red}${ch}${ANSI.reset}`;
        if (ch === '▒') return `${ANSI.yellow}${ch}${ANSI.reset}`;
        return `${ANSI.dim}·${ANSI.reset}`;
      })
      .join('');
    linesOut.push(`${ANSI.dim}${seqLabel} │${ANSI.reset}${cells}`);
  }

  const firstVisible = visible[0];
  const lastVisible = visible[visible.length - 1];
  const seqLeft = firstVisible ? String(firstVisible.sequence) : '—';
  const seqRight = lastVisible ? String(lastVisible.sequence) : '—';
  const seqPad = Math.max(0, chartWidth - seqLeft.length - seqRight.length);

  linesOut.push(
    `${ANSI.dim}${' '.repeat(labelCol)}└${'─'.repeat(chartWidth)}${ANSI.reset}`,
    `${' '.repeat(labelCol)}${ANSI.dim}${seqLeft}${' '.repeat(seqPad)}${seqRight}${ANSI.reset}`,
    `${ANSI.dim}[${ANSI.reset}${ANSI.bold}Ctrl+S${ANSI.reset}${ANSI.dim}] heap snapshot ` +
      `${ANSI.dim}|${ANSI.reset} ${ANSI.dim}[${ANSI.reset}${ANSI.bold}Ctrl+C${ANSI.reset}${ANSI.dim}] exit ` +
      `${ANSI.dim}|${ANSI.reset} ${formatSnapshotStatus(snapshotStatus)}`
  );

  terminal.write(`${ANSI.clearScreen}${linesOut.join('\n')}`);
}

/**
 * Redirects all `process.stdout` and `process.stderr` writes to a log file at `logPath`,
 * including writes coming from Kibana's logger appenders and `console.*`.
 *
 * Returns a `restore()` callback that undoes the override and closes the file descriptor.
 */
function redirectOutputToFile(logPath: string): () => void {
  const logFd = openSync(logPath, 'a');

  type WriteFn = typeof process.stdout.write;
  const origStdoutWrite: WriteFn = process.stdout.write.bind(process.stdout);
  const origStderrWrite: WriteFn = process.stderr.write.bind(process.stderr);

  const makeFileWriter = (): WriteFn => {
    const writer = (
      chunk: Uint8Array | string,
      encodingOrCb?: BufferEncoding | ((err?: Error | null) => void),
      cb?: (err?: Error | null) => void
    ): boolean => {
      if (typeof chunk === 'string') {
        writeSync(logFd, chunk);
      } else {
        writeSync(logFd, Buffer.from(chunk));
      }
      const callback = typeof encodingOrCb === 'function' ? encodingOrCb : cb;
      if (callback) callback(null);
      return true;
    };
    return writer as WriteFn;
  };

  (process.stdout as { write: WriteFn }).write = makeFileWriter();
  (process.stderr as { write: WriteFn }).write = makeFileWriter();

  let restored = false;
  return (): void => {
    if (restored) return;
    restored = true;
    (process.stdout as { write: WriteFn }).write = origStdoutWrite;
    (process.stderr as { write: WriteFn }).write = origStderrWrite;
    try {
      closeSync(logFd);
    } catch (_ignored) {
      // already closed
    }
  };
}

/**
 * Captures a v8 heap snapshot via the inspector protocol and streams it to `snapshotPath`.
 * Returns the on-disk byte size of the resulting `.heapsnapshot` file.
 */
async function takeHeapSnapshot(snapshotPath: string): Promise<number> {
  const session = new Session();
  const fd = openSync(snapshotPath, 'w');
  let bytesWritten = 0;
  try {
    session.connect();
    session.on('HeapProfiler.addHeapSnapshotChunk', (m) => {
      const chunk = m.params.chunk;
      writeSync(fd, chunk);
      bytesWritten += Buffer.byteLength(chunk);
    });
    await new Promise<void>((resolve, reject) => {
      session.post('HeapProfiler.takeHeapSnapshot', { reportProgress: false }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } finally {
    try {
      session.disconnect();
    } catch (_ignored) {
      // best-effort
    }
    try {
      closeSync(fd);
    } catch (_ignored) {
      // already closed
    }
  }
  return bytesWritten;
}

/**
 * Opens `/dev/tty` for reading and switches it to raw mode so we can intercept
 * single-byte keystrokes (Ctrl+S = 0x13, Ctrl+C = 0x03) without the terminal
 * driver swallowing them as flow-control / signals.
 *
 * Returns `undefined` if no controlling terminal is attached.
 */
function installKeyHandler(opts: {
  readonly onSnapshot: () => void;
  readonly onExit: () => void;
}): { readonly close: () => void } | undefined {
  let fd: number;
  try {
    fd = openSync('/dev/tty', 'r');
  } catch (_err) {
    return undefined;
  }

  let stream: tty.ReadStream;
  try {
    stream = new tty.ReadStream(fd);
  } catch (_err) {
    try {
      closeSync(fd);
    } catch (_ignored) {
      // already closed
    }
    return undefined;
  }

  if (!stream.isTTY) {
    try {
      stream.destroy();
    } catch (_ignored) {
      // best-effort
    }
    try {
      closeSync(fd);
    } catch (_ignored) {
      // already closed
    }
    return undefined;
  }

  try {
    stream.setRawMode(true);
  } catch (_err) {
    try {
      stream.destroy();
    } catch (_ignored) {
      // best-effort
    }
    try {
      closeSync(fd);
    } catch (_ignored) {
      // already closed
    }
    return undefined;
  }
  stream.resume();

  const onData = (chunk: Buffer): void => {
    for (const byte of chunk) {
      if (byte === 0x13) {
        opts.onSnapshot();
      } else if (byte === 0x03) {
        opts.onExit();
      }
    }
  };
  stream.on('data', onData);

  let closed = false;
  return {
    close: (): void => {
      if (closed) return;
      closed = true;
      stream.off('data', onData);
      try {
        stream.setRawMode(false);
      } catch (_ignored) {
        // best-effort
      }
      try {
        stream.destroy();
      } catch (_ignored) {
        // best-effort
      }
      try {
        closeSync(fd);
      } catch (_ignored) {
        // already closed
      }
    },
  };
}

export function maybeStartMemoryProfileCsv(log: Logger): void {
  const session = resolveSessionInfoWhenEnabled();
  if (!session) {
    return;
  }

  const outputPath = Path.join(session.cwd, `kibana-memory-profile-${session.timestamp}.csv`);
  const logPath = Path.join(session.cwd, `kibana-output-${session.timestamp}.log`);

  const terminal = openControllingTerminal();

  // Redirect all stdout/stderr to the log file before any writes happen.
  const restoreStdio = redirectOutputToFile(logPath);

  const chartRows: ChartRow[] = [];
  let snapshotStatus: SnapshotState = { kind: 'idle' };
  let snapshotCount = 0;

  /** Redraw the chart (or no-op if no terminal is available). */
  const repaint = (): void => {
    if (!terminal) return;
    drawMemoryChart(chartRows, terminal, snapshotStatus);
  };

  const triggerSnapshot = (): void => {
    if (snapshotStatus.kind === 'running') {
      return;
    }
    snapshotCount += 1;
    const seq = snapshotCount;
    const snapshotPath = Path.join(
      session.cwd,
      `kibana-heap-snapshot-${session.timestamp}-${formatSeq(seq)}.heapsnapshot`
    );
    const startedAt = Date.now();
    snapshotStatus = { kind: 'running', seq, path: snapshotPath, startedAt };
    log.warn(`Heap snapshot ${formatSeq(seq)} started -> ${snapshotPath}`);
    repaint();
    void takeHeapSnapshot(snapshotPath)
      .then((bytes) => {
        const durationMs = Date.now() - startedAt;
        snapshotStatus = { kind: 'done', seq, path: snapshotPath, bytes, durationMs };
        log.warn(
          `Heap snapshot ${formatSeq(seq)} complete: ${formatMib(bytes)} in ${durationMs}ms -> ${snapshotPath}`
        );
        repaint();
      })
      .catch((err: Error) => {
        const message = err instanceof Error ? err.message : String(err);
        snapshotStatus = { kind: 'error', seq, message };
        log.error(`Heap snapshot ${formatSeq(seq)} failed: ${message}`);
        repaint();
      });
  };

  let cleanedUp = false;
  let keys: { readonly close: () => void } | undefined;
  let unsubscribeResize: (() => void) | undefined;
  let intervalId: NodeJS.Timeout | undefined;
  let gcObserver: PerformanceObserver | undefined;
  const cleanup = (): void => {
    if (cleanedUp) return;
    cleanedUp = true;
    // Stop sources of work first so nothing fires after fds are closed.
    if (intervalId !== undefined) {
      clearInterval(intervalId);
      intervalId = undefined;
    }
    if (gcObserver !== undefined) {
      try {
        gcObserver.disconnect();
      } catch (_ignored) {
        // best-effort
      }
      gcObserver = undefined;
    }
    unsubscribeResize?.();
    keys?.close();
    if (terminal) {
      // Leave alt screen first so the previous terminal contents are restored,
      // then re-show the cursor in the user's original buffer.
      terminal.write(`${ANSI.exitAltScreen}${ANSI.showCursor}`);
      terminal.close();
    }
    restoreStdio();
  };
  process.once('SIGINT', cleanup);
  process.once('SIGTERM', cleanup);
  process.once('exit', cleanup);

  if (terminal) {
    keys = installKeyHandler({
      onSnapshot: triggerSnapshot,
      // Raw mode disables ISIG, so Ctrl+C no longer auto-generates SIGINT.
      // Re-emit it so the existing SIGINT handler (and Kibana's own) runs.
      onExit: () => {
        process.kill(process.pid, 'SIGINT');
      },
    });
    // Redraw immediately on SIGWINCH so the chart fills the new size without
    // waiting up to INTERVAL_MS for the next sampling tick.
    unsubscribeResize = terminal.onResize(repaint);
  }

  process.stderr.write(
    `[KBN_MEM_PROFILE] enabled: ${SAMPLES} samples / ${INTERVAL_MS}ms\n` +
      `[KBN_MEM_PROFILE] CSV:    ${outputPath}\n` +
      `[KBN_MEM_PROFILE] LOG:    ${logPath}\n` +
      `[KBN_MEM_PROFILE] TTY:    ${terminal ? 'yes' : 'unavailable (chart disabled)'}\n` +
      `[KBN_MEM_PROFILE] keys:   ${keys ? 'Ctrl+S=snapshot, Ctrl+C=exit' : 'unavailable'}\n`
  );

  log.warn('KBN_MEM_PROFILE=1 detected. Memory profiling enabled.');
  log.warn(`Memory profiling CSV: ${outputPath}`);
  log.warn(`Kibana output redirected to: ${logPath}`);
  log.info(
    `Memory profile enabled: ${SAMPLES} samples every ${INTERVAL_MS}ms, appending to ${outputPath}`
  );

  if (terminal) {
    terminal.write(
      `${ANSI.enterAltScreen}${ANSI.hideCursor}${ANSI.clearScreen}` +
        `${ANSI.dim}[KBN_MEM_PROFILE]${ANSI.reset} Waiting for first sample…\n` +
        `${ANSI.dim}CSV:${ANSI.reset} ${Path.basename(outputPath)}\n` +
        `${ANSI.dim}LOG:${ANSI.reset} ${Path.basename(logPath)}\n` +
        `${ANSI.dim}Terminal: ${terminal.columns}x${terminal.rows}${ANSI.reset}\n`
    );
  }

  const startedAt = Date.now();
  let tick = 0;

  gcObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType !== 'gc') {
        continue;
      }
      const detail = (entry as PerformanceEntry & { detail?: { kind: number; flags: number } })
        .detail;
      const kindLabel = detail ? formatGcKind(detail.kind) : 'unknown';
      if (kindLabel !== 'minor') {
        log.warn(
          `Garbage collection: kind=${kindLabel} durationMs=${entry.duration.toFixed(3)} flags=${
            detail?.flags ?? 'n/a'
          }`
        );
      }
    }
  });
  gcObserver.observe({ entryTypes: ['gc'] });

  void (async () => {
    try {
      await writeFile(outputPath, `${CSV_HEADER}\n`, 'utf8');
    } catch (err) {
      cleanup();
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[KBN_MEM_PROFILE] failed to create CSV: ${message}\n`);
      log.error(`Failed to create memory profile CSV: ${message}`);
      return;
    }

    intervalId = setInterval(() => {
      tick += 1;
      const timestampMs = Date.now();
      const mu = process.memoryUsage();
      const hs = v8.getHeapStatistics();

      const line = [
        tick,
        timestampMs,
        mu.rss,
        mu.heapTotal,
        mu.heapUsed,
        mu.external,
        mu.arrayBuffers,
        hs.used_heap_size,
        hs.total_heap_size,
        hs.external_memory,
        hs.malloced_memory,
        hs.peak_malloced_memory,
        hs.total_physical_size,
      ].join(',');

      chartRows.push({ sequence: tick, heapUsed: mu.heapUsed, v8TotalHeap: hs.total_heap_size });
      // Poll for size changes as a fallback — SIGWINCH may not be delivered in
      // some `--dev` worker process group setups. If size changed, the stream
      // emits `'resize'` and our `onResize` listener will repaint; we then
      // repaint again here unconditionally for the new sample.
      terminal?.refreshSize();
      repaint();

      log.warn(
        `memory sample ${tick}/${SAMPLES}: rss=${mu.rss} heapUsed=${mu.heapUsed} v8_total_heap_size=${hs.total_heap_size}`
      );

      void appendFile(outputPath, `${line}\n`, 'utf8').catch((appendErr: Error) => {
        process.stderr.write(`[KBN_MEM_PROFILE] append failed: ${appendErr.message}\n`);
        log.error(`Memory profile append failed: ${appendErr.message}`);
      });

      if (tick >= SAMPLES) {
        const msg = `Memory profile complete after ${
          Date.now() - startedAt
        }ms (${tick} rows) -> ${outputPath}`;
        // Log _before_ cleanup so the message lands in the log file, then restore stdio.
        log.info(msg);
        cleanup();
        process.stderr.write(`[KBN_MEM_PROFILE] ${msg}\n`);
      }
    }, INTERVAL_MS);
  })();
}
