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

import Fs from 'node:fs/promises';
import Os from 'node:os';
import Path from 'node:path';
import { promisify } from 'node:util';
import Zlib from 'node:zlib';
import type { MessagePort } from 'node:worker_threads';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Profile } from 'pprof-format';
import { BlockDetector, type DetectedBlock } from './block_detector';
import { formatSummary, summarizeProfile, trimToBlocks, type TimeRange } from './profile_summary';
import {
  BLOCK_THRESHOLD_MS,
  CONTEXT_MARGIN_MS,
  POLL_INTERVAL_MS,
  Slot,
  monotonicUs,
  type LogMessage,
  type MainToWorkerMessage,
  type WatchdogWorkerData,
} from './types';

const gzip = promisify(Zlib.gzip);
/** Recent blocks remembered to locate them in kept windows (a window lasts at most 60s). */
const MAX_REMEMBERED_BLOCKS = 200;

interface Block {
  startUs: number;
  endUs: number;
  blockedMs: number;
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

const fileName = (date: Date) =>
  `event-loop-block-${date.toISOString().replace(/[:.]/g, '-')}-${Os.hostname()}-${
    process.pid
  }.pb.gz`;

export const runWatchdogWorker = (port: MessagePort, data: WatchdogWorkerData): void => {
  const { sanitizeRoot, diagnosticDir } = data;
  const shared = new BigInt64Array(data.shared);
  const detector = new BlockDetector(BLOCK_THRESHOLD_MS);
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
      blocks.push({ startUs, endUs, blockedMs: block.blockedMs });
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

  const onProfile = async ({ bytes, windowStartUs, windowEndUs, kept }: MainToWorkerMessage) => {
    const windowBlocks = blocks.filter(
      ({ startUs, endUs }) => endUs >= windowStartUs && startUs <= windowEndUs
    );
    const ranges = windowBlocks.map(
      ({ startUs, endUs }): TimeRange => [startUs + epochOffsetUs, endUs + epochOffsetUs]
    );
    const profile = Profile.decode(bytes);
    // Summarise the whole window first: the summary reports how many of its samples were in blocks.
    const summary = summarizeProfile(profile, ranges, sanitizeRoot);
    let file: string | undefined;
    if (diagnosticDir) {
      // Without samples in blocks, the whole window is the only evidence: keep it.
      if (summary.scope === 'blocks') trimToBlocks(profile, ranges, CONTEXT_MARGIN_MS * 1000);
      file = Path.join(diagnosticDir, fileName(new Date()));
      await Fs.writeFile(file, await gzip(profile.encode()));
    }
    const blockedMs = windowBlocks.map(({ blockedMs: ms }) => Math.round(ms));
    log('warn', formatSummary(summary, blockedMs, kept, file), {
      tags: ['event-loop-watchdog'],
      kibana: { event_loop_watchdog: { profile: { ...summary, kept, blockedMs, file } } },
    });
  };

  port.on('message', (message: MainToWorkerMessage) => {
    onProfile(message).catch((error) =>
      log('error', `Failed to process event loop block profile: ${error.message}`)
    );
  });
  const timer = setInterval(poll, POLL_INTERVAL_MS);
  port.on('close', () => clearInterval(timer));
};

if (!isMainThread && parentPort) {
  runWatchdogWorker(parentPort, workerData as WatchdogWorkerData);
}
