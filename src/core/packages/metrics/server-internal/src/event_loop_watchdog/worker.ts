/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in the watchdog worker thread: detects blocks from the main thread's heartbeat and, while a
 * block lasts, samples the main thread's call stack through an inspector session (Debugger
 * pause/resume). Inspector commands run on the main thread through V8 interrupts, so sampling
 * works while it is blocked, and the debugger, enabled once at startup, has no cold start per
 * capture (unlike the CPU profiler). All logs are posted to the main thread's logger.
 */

import { Session } from 'node:inspector';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectedBlock } from './block_detector';
import {
  describeFrames,
  stacksToProfile,
  summarizeProfile,
  type SampledFrame,
} from './profile_summary';
import {
  BLOCK_THRESHOLD_MS,
  MAX_PROFILE_MS,
  POLL_INTERVAL_MS,
  PROFILE_AFTER_MS,
  PROFILE_COOLDOWN_MS,
  SAMPLE_INTERVAL_MS,
  Slot,
  monotonicUs,
  type LogMessage,
  type Phase,
  type WatchdogWorkerData,
} from './types';

interface DebuggerCallFrame {
  functionName: string;
  /** Script id; the frame's own `url` is deprecated and empty. */
  location: { scriptId: string; lineNumber: number; columnNumber?: number };
}

/** The part of `node:inspector`'s `Session` used here. */
export interface InspectorSession {
  connectToMainThread(): void;
  post(
    method: string,
    params: object,
    callback: (error: Error | null, result?: object) => void
  ): void;
  on(
    event: 'Debugger.paused',
    listener: (message: { params: { callFrames: DebuggerCallFrame[] } }) => void
  ): void;
  on(
    event: 'Debugger.scriptParsed',
    listener: (message: { params: { scriptId: string; url: string } }) => void
  ): void;
  disconnect(): void;
}

interface Capture {
  /** Monotonic µs when the block started (its last heartbeat). */
  blockStartUs: number;
  requestedAtUs: number;
  firstSampleAtUs?: number;
  stacks: SampledFrame[][];
  /** Per sample: request → paused (stack captured), and paused → resumed. */
  pauseMs: number[];
  resumeMs: number[];
  stopping: boolean;
}

const median = (values: number[]) =>
  values.length === 0 ? 0 : [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const round = (value: number) => Math.round(value * 10) / 10;

export const runWatchdogWorker = (
  port: MessagePort,
  data: WatchdogWorkerData,
  createSession: () => InspectorSession = () => new Session()
): void => {
  const {
    sanitizeRoot,
    profiling: { afterMs, maxMs, cooldownMs, sampleIntervalMs } = {
      afterMs: PROFILE_AFTER_MS,
      maxMs: MAX_PROFILE_MS,
      cooldownMs: PROFILE_COOLDOWN_MS,
      sampleIntervalMs: SAMPLE_INTERVAL_MS,
    },
  } = data;
  const shared = new BigInt64Array(data.shared);
  const detector = new BlockDetector(BLOCK_THRESHOLD_MS);
  /** Phase at `atUs`: running once the main thread has marked it. */
  const phaseAt = (atUs: number): Phase => {
    const runningSince = Number(Atomics.load(shared, Slot.runningSince));
    return runningSince > 0 && atUs >= runningSince ? 'running' : 'startup';
  };
  const epochOffsetUs =
    Math.round((performance.timeOrigin + performance.now()) * 1000) - monotonicUs();
  const log = (level: LogMessage['level'], message: string, meta?: LogMessage['meta']) =>
    port.postMessage({ type: 'log', level, message, meta } satisfies LogMessage);

  const session = createSession();
  const post = <T>(method: string, params: object = {}) =>
    new Promise<T>((resolve, reject) =>
      session.post(method, params, (error, result) =>
        error ? reject(error) : resolve(result as T)
      )
    );
  /** Script urls by id, to locate sampled frames (their own `url` is empty). */
  const scriptUrls = new Map<string, string>();
  let unrequestedPauses = 0;
  let pendingSample: ((frames: DebuggerCallFrame[]) => void) | undefined;
  let enabled = false;
  session.on('Debugger.scriptParsed', ({ params }) => scriptUrls.set(params.scriptId, params.url));
  session.on('Debugger.paused', ({ params }) => {
    if (pendingSample) {
      const resolve = pendingSample;
      pendingSample = undefined;
      resolve(params.callFrames);
      return;
    }
    // Not ours (e.g. a `debugger;` statement in the short window pauses are allowed): resume.
    unrequestedPauses++;
    post('Debugger.resume').catch(() => {});
  });
  session.connectToMainThread();
  const enableRequestedAtUs = monotonicUs();
  // Pipelined, so that no `debugger;` statement can pause in between. Pauses stay skipped except
  // for the instant of each requested sample.
  Promise.all([post('Debugger.enable'), post('Debugger.setSkipAllPauses', { skip: true })])
    .then(() => {
      enabled = true;
      const enableMs = round((monotonicUs() - enableRequestedAtUs) / 1000);
      log(
        'info',
        `Event loop watchdog debugger enabled in ${enableMs}ms (${scriptUrls.size} scripts)`,
        {
          tags: ['event-loop-watchdog'],
          kibana: { event_loop_watchdog: { debugger: { enableMs, scripts: scriptUrls.size } } },
        }
      );
    })
    .catch((error) => log('warn', `Event loop stack sampling unavailable: ${error.message}`));

  let capture: Capture | undefined;
  let lastCaptureAtUs = -Infinity;
  let captured = 0;

  /** Pauses the main thread once, records its stack, and resumes it. */
  const sample = async (current: Capture) => {
    const requestedAtUs = monotonicUs();
    const frames = new Promise<DebuggerCallFrame[]>((resolve) => (pendingSample = resolve));
    await Promise.all([post('Debugger.setSkipAllPauses', { skip: false }), post('Debugger.pause')]);
    const callFrames = await frames;
    const pausedAtUs = monotonicUs();
    await Promise.all([post('Debugger.resume'), post('Debugger.setSkipAllPauses', { skip: true })]);
    current.firstSampleAtUs ??= pausedAtUs;
    current.pauseMs.push((pausedAtUs - requestedAtUs) / 1000);
    current.resumeMs.push((monotonicUs() - pausedAtUs) / 1000);
    current.stacks.push(
      callFrames.map(({ functionName, location }) => ({
        functionName,
        url: scriptUrls.get(location.scriptId) ?? '',
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber ?? 0,
      }))
    );
  };

  const startCapture = (blockStartUs: number) => {
    const current: Capture = {
      blockStartUs,
      requestedAtUs: monotonicUs(),
      stacks: [],
      pauseMs: [],
      resumeMs: [],
      stopping: false,
    };
    capture = current;
    lastCaptureAtUs = current.requestedAtUs;
    const loop = async () => {
      while (!current.stopping) {
        await sample(current);
        await new Promise((resolve) => setTimeout(resolve, sampleIntervalMs));
      }
    };
    loop().catch((error) => {
      current.stopping = true;
      log('warn', `Failed to sample an event loop block: ${error.message}`);
    });
  };

  const stopCapture = (current: Capture, blockedMs: number) => {
    if (current.stopping) return;
    current.stopping = true;
    if (capture === current) capture = undefined;
    const summary = summarizeProfile(stacksToProfile(current.stacks), sanitizeRoot);
    const measurements = {
      blockedMs: Math.round(blockedMs),
      sampledAfterMs: Math.round((current.requestedAtUs - current.blockStartUs) / 1000),
      firstSampleAfterMs: current.firstSampleAtUs
        ? Math.round((current.firstSampleAtUs - current.blockStartUs) / 1000)
        : undefined,
      samples: current.stacks.length,
      pauseMsMedian: round(median(current.pauseMs)),
      pauseMsMax: round(Math.max(0, ...current.pauseMs)),
      resumeMsMedian: round(median(current.resumeMs)),
      resumeMsMax: round(Math.max(0, ...current.resumeMs)),
      sampleIntervalMs,
      unrequestedPauses,
      scripts: scriptUrls.size,
    };
    log(
      'warn',
      `Event loop block stack samples #${++captured}: block ~${
        measurements.blockedMs
      }ms (sampling after ~${measurements.sampledAfterMs}ms, first sample after ~${
        measurements.firstSampleAfterMs ?? '-'
      }ms), ${measurements.samples} samples, pause→stack median ${
        measurements.pauseMsMedian
      }ms (max ${measurements.pauseMsMax}ms), resume median ${
        measurements.resumeMsMedian
      }ms. Top: ${describeFrames(summary.frames)}. Kibana code: ${describeFrames(
        summary.kibanaFrames
      )}.`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            samples: {
              ...summary,
              ...measurements,
              captured,
              phase: phaseAt(current.blockStartUs),
            },
          },
        },
      }
    );
  };

  const onBlock = (block: DetectedBlock) => {
    const startUs = block.startedAt * 1000;
    if (capture && !capture.stopping && capture.blockStartUs === startUs) {
      stopCapture(capture, block.blockedMs);
    }
    if (!block.report) return;
    const blockedMs = Math.round(block.blockedMs);
    log(
      'warn',
      `Event loop blocked for ~${blockedMs}ms${
        block.suppressedBlocks ? `; ${block.suppressedBlocks} earlier blocks not reported` : ''
      }`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            blockedMs,
            startedAt: new Date((startUs + epochOffsetUs) / 1000).toISOString(),
            phase: phaseAt(startUs),
            suppressedBlocks: block.suppressedBlocks,
          },
        },
      }
    );
  };

  const poll = () => {
    const nowMs = monotonicUs() / 1000;
    const block = detector.poll(nowMs, Number(Atomics.load(shared, Slot.heartbeat)) / 1000);
    if (block) onBlock(block);
    const { blockedSince } = detector;
    if (blockedSince === undefined || !enabled) return;
    if (
      !capture &&
      nowMs - blockedSince >= afterMs &&
      nowMs * 1000 - lastCaptureAtUs >= cooldownMs * 1000
    ) {
      startCapture(blockedSince * 1000);
    } else if (
      capture &&
      capture.blockStartUs === blockedSince * 1000 &&
      nowMs * 1000 - capture.requestedAtUs >= maxMs * 1000
    ) {
      // still blocked: keep what was sampled so far
      stopCapture(capture, nowMs - blockedSince);
    }
  };

  const timer = setInterval(poll, POLL_INTERVAL_MS);
  port.on('close', () => {
    clearInterval(timer);
    try {
      session.disconnect(); // also ends any pause and disables the debugger
    } catch {
      // already disconnected
    }
  });
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
