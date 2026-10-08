/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in the watchdog worker thread: detects blocks from the main thread's heartbeat and, when a
 * block is egregious, profiles the main thread through an inspector session. Inspector commands
 * run on the main thread through V8 interrupts, so profiling can start while it is blocked. The
 * profile arrives parsed in this thread, which summarises and writes it. All logs are posted to
 * the main thread's logger.
 */

import Fs from 'node:fs/promises';
import { Session } from 'node:inspector';
import Os from 'node:os';
import Path from 'node:path';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { WriteAdmission, type AdmissionLimits } from './admission';
import { BlockDetector, type DetectedBlock } from './block_detector';
import {
  formatSummary,
  summarizeProfile,
  type CpuProfile,
  type ProfileOutcome,
} from './profile_summary';
import {
  BLOCK_THRESHOLD_MS,
  MAX_PROFILE_MS,
  MAX_STARTUP_FILES,
  POLL_INTERVAL_MS,
  PROFILE_AFTER_MS,
  PROFILE_COOLDOWN_MS,
  SAMPLING_INTERVAL_US,
  Slot,
  monotonicUs,
  type LogMessage,
  type Phase,
  type WatchdogWorkerData,
} from './types';

/** The part of `node:inspector`'s `Session` used here. */
export interface InspectorSession {
  connectToMainThread(): void;
  post(
    method: string,
    params: object,
    callback: (error: Error | null, result?: object) => void
  ): void;
  disconnect(): void;
}

/** Leads with the phase and the zero-padded block duration, so sorted listings surface the worst. */
const fileName = (phase: Phase, blockedMs: number, date: Date) =>
  `event-loop-block-${phase}-${String(Math.round(blockedMs)).padStart(6, '0')}ms-${date
    .toISOString()
    .replace(/[:.]/g, '-')}-${Os.hostname()}-${process.pid}.cpuprofile`;

/** Startup blocks are written only for a new largest startup block. */
const STARTUP_ADMISSION_LIMITS: AdmissionLimits = {
  maxLargest: 1,
  minGrowth: 1,
  maxRanked: 0,
  maxFiles: MAX_STARTUP_FILES,
};

interface Capture {
  session: InspectorSession;
  /** Monotonic µs when the block started (its last heartbeat). */
  blockStartUs: number;
  requestedAtUs: number;
  profilerStartMs?: number;
  stopping: boolean;
}

export const runWatchdogWorker = (
  port: MessagePort,
  data: WatchdogWorkerData,
  createSession: () => InspectorSession = () => new Session()
): void => {
  const {
    sanitizeRoot,
    diagnosticDir,
    profiling: { afterMs, maxMs, cooldownMs } = {
      afterMs: PROFILE_AFTER_MS,
      maxMs: MAX_PROFILE_MS,
      cooldownMs: PROFILE_COOLDOWN_MS,
    },
  } = data;
  const shared = new BigInt64Array(data.shared);
  const detector = new BlockDetector(BLOCK_THRESHOLD_MS);
  /** Phase at `atUs`: running once the main thread has marked it. */
  const phaseAt = (atUs: number): Phase => {
    const runningSince = Number(Atomics.load(shared, Slot.runningSince));
    return runningSince > 0 && atUs >= runningSince ? 'running' : 'startup';
  };
  const admissions: Record<Phase, WriteAdmission> = {
    startup: new WriteAdmission(STARTUP_ADMISSION_LIMITS),
    running: new WriteAdmission(data.admissionLimits),
  };
  const epochOffsetUs =
    Math.round((performance.timeOrigin + performance.now()) * 1000) - monotonicUs();
  const log = (level: LogMessage['level'], message: string, meta?: LogMessage['meta']) =>
    port.postMessage({ type: 'log', level, message, meta } satisfies LogMessage);

  let capture: Capture | undefined;
  let lastCaptureAtUs = -Infinity;
  let profiled = 0;

  const post = <T>(session: InspectorSession, method: string, params: object = {}) =>
    new Promise<T>((resolve, reject) =>
      session.post(method, params, (error, result) =>
        error ? reject(error) : resolve(result as T)
      )
    );

  const endCapture = (current: Capture) => {
    try {
      current.session.disconnect(); // also stops a profile that is still running
    } catch {
      // already disconnected
    }
    if (capture === current) capture = undefined;
  };

  const startCapture = (blockStartUs: number) => {
    const session = createSession();
    session.connectToMainThread();
    const current: Capture = {
      session,
      blockStartUs,
      requestedAtUs: monotonicUs(),
      stopping: false,
    };
    capture = current;
    lastCaptureAtUs = current.requestedAtUs;
    // Pipelined: the main thread runs them in order at its next interrupt check.
    Promise.all([
      post(session, 'Profiler.enable'),
      post(session, 'Profiler.setSamplingInterval', { interval: SAMPLING_INTERVAL_US }),
      post(session, 'Profiler.start'),
    ])
      .then(() => {
        current.profilerStartMs = (monotonicUs() - current.requestedAtUs) / 1000;
      })
      .catch((error) => {
        log('warn', `Failed to start profiling an event loop block: ${error.message}`);
        endCapture(current);
      });
  };

  const onProfile = async (current: Capture, profile: CpuProfile, blockedMs: number) => {
    const summary = summarizeProfile(profile, sanitizeRoot);
    const phase = phaseAt(current.blockStartUs);
    const block = {
      blockedMs,
      profiledAfterMs: (current.requestedAtUs - current.blockStartUs) / 1000,
      profilerStartMs: current.profilerStartMs,
    };
    let outcome: ProfileOutcome = { notWritten: 'no diagnostic directory' };
    if (summary.samples === 0) {
      outcome = { notWritten: 'no busy samples (the block ended as profiling started)' };
    } else if (diagnosticDir) {
      const admitted = admissions[phase].admit(blockedMs);
      if (admitted.write) {
        // Files there are collected a minute after their last change: no partial uploads.
        const file = Path.join(diagnosticDir, fileName(phase, blockedMs, new Date()));
        await Fs.writeFile(file, JSON.stringify(profile));
        outcome = { file };
      } else {
        outcome = { notWritten: admitted.reason };
      }
    }
    // Written profiles are the ones to look at; the others still show where blocks come from.
    log('file' in outcome ? 'warn' : 'info', formatSummary(summary, block, ++profiled, outcome), {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: {
          profile: { ...summary, ...block, profiled, phase, ...outcome },
        },
      },
    });
  };

  const stopCapture = (current: Capture, blockedMs: number) => {
    if (current.stopping) return;
    current.stopping = true;
    post<{ profile: CpuProfile }>(current.session, 'Profiler.stop')
      .then(({ profile }) => onProfile(current, profile, blockedMs))
      .catch((error) =>
        log('error', `Failed to process an event loop block profile: ${error.message}`)
      )
      .finally(() => endCapture(current));
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
    if (blockedSince === undefined) return;
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
    if (capture) endCapture(capture);
  });
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
