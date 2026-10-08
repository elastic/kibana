/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in the watchdog worker thread: detects blocks from the main thread's heartbeat, flags them
 * to the main thread's profiling session through shared memory, and summarises/stores the
 * profiles the main thread keeps. All logs are posted to the main thread's logger.
 */

import Os from 'node:os';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { BlockDetector, type DetectedBlock } from './block_detector';
import { WriteAdmission, type AdmissionLimits } from './admission';
import { writeFileAtomically } from './atomic_write';
import {
  formatSummary,
  summarizeProfile,
  trimToBlocks,
  type CpuProfile,
  type ProfileOutcome,
  type TimeRange,
} from './profile_summary';
import {
  BLOCK_THRESHOLD_MS,
  CONTEXT_MARGIN_MS,
  MAX_STARTUP_FILES,
  POLL_INTERVAL_MS,
  Slot,
  monotonicUs,
  type LogMessage,
  type Phase,
  type MainToWorkerMessage,
  type WatchdogWorkerData,
} from './types';

/** Recent blocks remembered to locate them in kept windows (a window lasts at most 60s). */
const MAX_REMEMBERED_BLOCKS = 200;

interface Block {
  startUs: number;
  endUs: number;
  blockedMs: number;
  phase: Phase;
}

/** Whether a rotation of the main thread's profiler overlapped `[startUs, endUs]`. */
export const overlapsRotation = (
  startUs: number,
  endUs: number,
  rotationStartUs: number,
  rotationEndUs: number
): boolean =>
  rotationStartUs > 0 &&
  rotationStartUs <= endUs &&
  (rotationEndUs < rotationStartUs || rotationEndUs >= startUs);

/** Leads with the phase and the zero-padded largest block, so sorted listings surface the worst. */
const fileName = (phase: Phase, maxBlockedMs: number, date: Date) =>
  `event-loop-block-${phase}-${String(Math.round(maxBlockedMs)).padStart(6, '0')}ms-${date
    .toISOString()
    .replace(/[:.]/g, '-')}-${Os.hostname()}-${process.pid}.cpuprofile`;

/** Startup windows are written only for a new largest startup block. */
const STARTUP_ADMISSION_LIMITS: AdmissionLimits = {
  maxLargest: 1,
  minGrowth: 1,
  maxRanked: 0,
  maxFiles: MAX_STARTUP_FILES,
};

export const runWatchdogWorker = (port: MessagePort, data: WatchdogWorkerData): void => {
  const { sanitizeRoot, diagnosticDir } = data;
  const shared = new BigInt64Array(data.shared);
  const detector = new BlockDetector(BLOCK_THRESHOLD_MS);
  /** Phase at `atUs` (now by default): running once the main thread has marked it. */
  const currentPhase = (atUs = monotonicUs()): Phase => {
    const runningSince = Number(Atomics.load(shared, Slot.runningSince));
    return runningSince > 0 && atUs >= runningSince ? 'running' : 'startup';
  };
  const admissions: Record<Phase, WriteAdmission> = {
    startup: new WriteAdmission(STARTUP_ADMISSION_LIMITS),
    running: new WriteAdmission(data.admissionLimits),
  };
  const blocks: Block[] = [];
  const epochOffsetUs =
    Math.round((performance.timeOrigin + performance.now()) * 1000) - monotonicUs();
  const log = (level: LogMessage['level'], message: string, meta?: LogMessage['meta']) =>
    port.postMessage({ type: 'log', level, message, meta } satisfies LogMessage);

  const poll = () => {
    const heartbeat = Atomics.load(shared, Slot.heartbeat);
    const block = detector.poll(monotonicUs() / 1000, Number(heartbeat) / 1000);
    if (block) onBlock(block);
    // Acknowledge after counting, so the main thread can rotate knowing the block is flagged.
    Atomics.store(shared, Slot.classified, heartbeat);
  };

  const onBlock = (block: DetectedBlock) => {
    const startUs = block.startedAt * 1000;
    const endUs = block.endedAt * 1000;
    const profilerCaused = overlapsRotation(
      startUs,
      endUs,
      Number(Atomics.load(shared, Slot.rotationStart)),
      Number(Atomics.load(shared, Slot.rotationEnd))
    );
    if (!profilerCaused) {
      blocks.push({ startUs, endUs, blockedMs: block.blockedMs, phase: currentPhase(startUs) });
      if (blocks.length > MAX_REMEMBERED_BLOCKS) blocks.shift();
      Atomics.add(shared, Slot.blocks, 1n);
    }
    if (!block.report) return;
    const blockedMs = Math.round(block.blockedMs);
    log(
      'warn',
      `Event loop blocked for ~${blockedMs}ms${
        profilerCaused ? ' (overlapping a profiler start or rotation)' : ''
      }${block.suppressedBlocks ? `; ${block.suppressedBlocks} earlier blocks not reported` : ''}`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            blockedMs,
            startedAt: new Date((startUs + epochOffsetUs) / 1000).toISOString(),
            profilerCaused,
            suppressedBlocks: block.suppressedBlocks,
          },
        },
      }
    );
  };

  const onProfile = async ({
    json,
    stoppedAtUs,
    windowStartUs,
    windowEndUs,
    kept,
  }: MainToWorkerMessage) => {
    const windowBlocks = blocks.filter(
      ({ startUs, endUs }) => endUs >= windowStartUs && startUs <= windowEndUs
    );
    const profile: CpuProfile = JSON.parse(json);
    // V8's profile clock is not hrtime's: the profile ended just before the main thread's stamp.
    const clockOffsetUs = profile.endTime - stoppedAtUs;
    const ranges = windowBlocks.map(
      ({ startUs, endUs }): TimeRange => [startUs + clockOffsetUs, endUs + clockOffsetUs]
    );
    // Summarise the whole window first: the summary reports how many of its samples were in blocks.
    const summary = summarizeProfile(profile, ranges, sanitizeRoot);
    const blockedMs = windowBlocks.map(({ blockedMs: ms }) => Math.round(ms));
    const maxBlockedMs = Math.max(0, ...blockedMs);
    // A window belongs to the phase of its largest block.
    const largest = windowBlocks.reduce<Block | undefined>(
      (max, block) => (max && max.blockedMs >= block.blockedMs ? max : block),
      undefined
    );
    const phase = largest?.phase ?? currentPhase();
    let outcome: ProfileOutcome = { notWritten: 'no diagnostic directory' };
    if (windowBlocks.length === 0) {
      // e.g. the window was flagged by a worker that has since been replaced: nothing to rank on
      outcome = { notWritten: 'no block recorded for this window' };
    } else if (diagnosticDir) {
      const admitted = admissions[phase].admit(maxBlockedMs);
      if (admitted.write) {
        // Without samples in blocks, the whole window is the only evidence: keep it.
        const written =
          summary.scope === 'blocks'
            ? trimToBlocks(profile, ranges, CONTEXT_MARGIN_MS * 1000)
            : profile;
        const file = await writeFileAtomically(
          diagnosticDir,
          fileName(phase, maxBlockedMs, new Date()),
          JSON.stringify(written)
        );
        outcome = { file };
      } else {
        outcome = { notWritten: admitted.reason };
      }
    }
    // Written profiles are the ones to look at; the others still count towards block frequency.
    log('file' in outcome ? 'warn' : 'info', formatSummary(summary, blockedMs, kept, outcome), {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: {
          profile: { ...summary, kept, phase, blockedMs, maxBlockedMs, ...outcome },
        },
      },
    });
  };

  // One profile at a time: bounds the worker's memory to a single decoded profile.
  let processing = Promise.resolve();
  port.on('message', (message: MainToWorkerMessage) => {
    processing = processing
      .then(() => onProfile(message))
      .catch((error) =>
        log('error', `Failed to process event loop block profile: ${error.message}`)
      );
  });
  const timer = setInterval(poll, POLL_INTERVAL_MS);
  port.on('close', () => clearInterval(timer));
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
