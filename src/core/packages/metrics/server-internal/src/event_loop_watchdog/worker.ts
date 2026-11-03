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
import { BlockStats } from './block_stats';
import type { BlockLogMeta, Phase, StatsLogMeta, WatchdogWorkerData } from './types';
import { POLL_INTERVAL_MS, Slot, WATCHDOG_WORKER_NAME, monotonicUs } from './constants';

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
  /** Wall-clock start of the last block logged, keyed by its heartbeat in milliseconds. */
  let loggedBlockStart: { heartbeatMs: number; startedAt: string } | undefined;

  /** Phase of a heartbeat: running once the main thread has marked it. */
  const phaseAt = (heartbeatUs: number): Phase => {
    const runningSince = Number(Atomics.load(shared, Slot.runningSince));
    return runningSince > 0 && heartbeatUs >= runningSince ? 'running' : 'starting';
  };

  /**
   * Measured back from now, so a wall-clock step can't shift it, and only once per block, so every
   * log line of one block carries the same value.
   */
  const startedAtOf = ({ startedAt }: DetectedBlock, nowMs: number): string => {
    if (loggedBlockStart?.heartbeatMs !== startedAt) {
      loggedBlockStart = {
        heartbeatMs: startedAt,
        startedAt: new Date(Date.now() - (nowMs - startedAt)).toISOString(),
      };
    }
    return loggedBlockStart.startedAt;
  };

  const onBlock = (block: DetectedBlock, nowMs: number) => {
    // A block counts once, when it ends.
    if (!block.ongoing) {
      stats.record(block);
    }
    if (!block.report) {
      return;
    }
    const { blockedMs, phase, suppressedBlocks, ongoing } = block;
    logger.warn<BlockLogMeta>(blockMessage(block), {
      tags: ['event-loop-watchdog'],
      kibana: {
        event_loop_watchdog: {
          blockedMs,
          startedAt: startedAtOf(block, nowMs),
          phase,
          suppressedBlocks,
          ongoing,
        },
      },
    });
  };

  const poll = () => {
    // Clock first: if the worker pauses between the two reads, a heartbeat stamped meanwhile is
    // newer than now, instead of looking stale and reading as a block.
    const nowMs = toMs(nowUs());
    const heartbeatUs = Number(Atomics.load(shared, Slot.heartbeat));
    // The threshold and the phase tag come from the same read.
    const phase = phaseAt(heartbeatUs);
    const block = detector.poll(nowMs, toMs(heartbeatUs), {
      thresholdMs: thresholdsMs[phase],
      phase,
    });
    if (block) {
      onBlock(block, nowMs);
    }
  };

  const writeStats = () => {
    const now = toMs(nowUs());
    const droppedBefore = logger.getDroppedLogLineCount();
    const snapshot = stats.snapshot(now);
    logger.info<StatsLogMeta>(
      `Event loop watchdog stats for the last ${Math.round(snapshot.periodMs / 1000)}s: ${blocks(
        snapshot.starting.blocks
      )} while starting, ${blocks(snapshot.running.blocks)} while running`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            stats: {
              ...snapshot,
              heapUsed: heapUsed(),
              droppedLogLines: droppedBefore - reportedDroppedLogLines,
            },
          },
        },
      }
    );
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
