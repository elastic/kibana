/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Runs in the watchdog worker thread: detects blocks from the main thread's heartbeat and writes
 * its log lines straight to stdout, because the main thread is blocked exactly when they matter.
 */

import { getHeapStatistics } from 'node:v8';
import { isMainThread, workerData } from 'node:worker_threads';
import type { WorkerLogger } from '@kbn/core-threads-server-internal';
import { createWorkerLogger } from '@kbn/core-threads-server-internal';
import { BlockDetector, type DetectedBlock } from './block_detector';
import { BlockStats, type BlockStatsSnapshot } from './block_stats';
import type { BlockLogMeta, OngoingBlockStats, StatsLogMeta, WatchdogWorkerData } from './types';
import { POLL_INTERVAL_MS, Slot, WATCHDOG_WORKER_NAME, monotonicUs, phaseOf } from './constants';

export interface WatchdogWorkerDeps {
  logger: WorkerLogger;
  /** Monotonic clock in microseconds, the same clock the main thread stamps. */
  nowUs?: () => number;
  heapUsed?: () => number;
}

const toMs = (us: number): number => Math.floor(us / 1000);
const blocks = (count: number): string => `${count} ${count === 1 ? 'block' : 'blocks'}`;

const blockMessage = ({ blockedMs, ongoing, suppressedBlocks }: DetectedBlock): string =>
  `Event loop blocked for ~${blockedMs}ms${ongoing ? ' so far' : ''}${
    suppressedBlocks ? `; ${blocks(suppressedBlocks)} before it not reported` : ''
  }`;

const statsMessage = (
  { periodMs, starting, running }: BlockStatsSnapshot,
  ongoing?: OngoingBlockStats
): string =>
  `Event loop watchdog stats for the last ${Math.round(periodMs / 1000)}s: ${blocks(
    starting.blocks
  )} while starting, ${blocks(running.blocks)} while running${
    ongoing ? `; a ${ongoing.phase} block is ongoing for ~${ongoing.blockedMs}ms` : ''
  }`;

/** Starts detection; returns a function that stops it (for tests: the worker never stops itself). */
export const runWatchdogWorker = (
  { shared: sharedBuffer, thresholdsMs, statsIntervalMs }: WatchdogWorkerData,
  {
    logger,
    nowUs = monotonicUs,
    heapUsed = () => getHeapStatistics().used_heap_size,
  }: WatchdogWorkerDeps
): (() => void) => {
  const shared = new BigInt64Array(sharedBuffer);
  const detector = new BlockDetector();
  const stats = new BlockStats(thresholdsMs, toMs(nowUs()));
  let reportedDroppedLogLines = logger.getDroppedLogLineCount();
  /** The ongoing block as shared with the main thread, so it can report the block if this worker can't. */
  let sharedBlock: { heartbeatUs: bigint; startedAt: string } | undefined;

  const phaseAt = (heartbeatUs: number) =>
    phaseOf(heartbeatUs, Number(Atomics.load(shared, Slot.runningSince)));

  const logBlock = (block: DetectedBlock, startedAt: string) => {
    const { blockedMs, phase, suppressedBlocks, ongoing } = block;
    logger.warn<BlockLogMeta>(blockMessage(block), {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: { blockedMs, startedAt, phase, suppressedBlocks, ongoing },
      },
    });
  };

  /**
   * Shares a block the detector just found with the main thread: the epoch slot first, so it is
   * in place once the start slot is. `startedAt` is fixed here, measured back from now, so every
   * log line of this block carries the same value. The trade-off: a wall-clock change during the
   * block no longer moves `startedAt` on the end log line, which is measured in monotonic time.
   */
  const shareBlock = (heartbeatUs: bigint, startedAtMs: number, nowMs: number) => {
    const startedAtEpochMs = Date.now() - (nowMs - startedAtMs);
    sharedBlock = { heartbeatUs, startedAt: new Date(startedAtEpochMs).toISOString() };
    Atomics.store(shared, Slot.blockStartedAtEpochMs, BigInt(startedAtEpochMs));
    Atomics.store(shared, Slot.blockStartedAt, heartbeatUs);
  };

  /** Claims the block's end; false when the main thread already reported it. */
  const claimBlockEnd = (): boolean => {
    if (!sharedBlock) {
      return false;
    }
    const { heartbeatUs } = sharedBlock;
    sharedBlock = undefined;
    return Atomics.compareExchange(shared, Slot.blockStartedAt, heartbeatUs, 0n) === heartbeatUs;
  };

  const onBlock = (block: DetectedBlock) => {
    if (block.ongoing) {
      if (block.report && sharedBlock) {
        logBlock(block, sharedBlock.startedAt);
      }
      return;
    }
    const startedAt = sharedBlock?.startedAt;
    if (!claimBlockEnd() || startedAt === undefined) {
      return;
    }
    stats.record(block);
    if (block.report) {
      logBlock(block, startedAt);
    }
  };

  const poll = () => {
    // Clock first: if the worker pauses between the two reads, a heartbeat stamped meanwhile is
    // newer than now, instead of looking stale and reading as a block.
    const nowMs = toMs(nowUs());
    const heartbeat = Atomics.load(shared, Slot.heartbeat);
    const heartbeatUs = Number(heartbeat);
    // The threshold and the phase tag come from the same read.
    const phase = phaseAt(heartbeatUs);
    const block = detector.poll(nowMs, toMs(heartbeatUs), {
      thresholdMs: thresholdsMs[phase],
      phase,
    });
    const { ongoingStartedAt } = detector;
    if (ongoingStartedAt !== undefined && !sharedBlock) {
      shareBlock(heartbeat, ongoingStartedAt, nowMs);
    }
    if (block) {
      onBlock(block);
    }
  };

  const ongoingStats = (now: number): OngoingBlockStats | undefined => {
    const { ongoingStartedAt } = detector;
    if (ongoingStartedAt === undefined || !sharedBlock) {
      return;
    }
    return {
      phase: phaseAt(Number(sharedBlock.heartbeatUs)),
      blockedMs: now - ongoingStartedAt,
    };
  };

  const writeStats = () => {
    const now = toMs(nowUs());
    const droppedBefore = logger.getDroppedLogLineCount();
    const snapshot = stats.snapshot(now);
    const ongoing = ongoingStats(now);
    logger.info<StatsLogMeta>(statsMessage(snapshot, ongoing), {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: {
          stats: {
            ...snapshot,
            heapUsed: heapUsed(),
            droppedLogLines: droppedBefore - reportedDroppedLogLines,
            ...(ongoing ? { ongoing } : {}),
          },
        },
      },
    });
    // A lost stats log line keeps its counts for the next one, so the sums stay right.
    if (logger.getDroppedLogLineCount() === droppedBefore) {
      stats.reset(now);
      reportedDroppedLogLines = droppedBefore;
    }
  };

  // The poll interval is also what keeps this worker alive, so keep it referenced.
  const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
  const statsTimer = setInterval(writeStats, statsIntervalMs);

  return () => {
    clearInterval(pollTimer);
    clearInterval(statsTimer);
  };
};

if (!isMainThread) {
  const { data } = workerData as { data: WatchdogWorkerData };
  runWatchdogWorker(data, { logger: createWorkerLogger(data.logging, WATCHDOG_WORKER_NAME) });
}
