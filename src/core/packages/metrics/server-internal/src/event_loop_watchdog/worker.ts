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
import { REPO_ROOT } from '@kbn/repo-info';
import type { WorkerLogger } from '@kbn/core-threads-server-internal';
import { createWorkerLogger } from '@kbn/core-threads-server-internal';
import { BlockDetector, type DetectedBlock } from './block_detector';
import { BlockStats } from './block_stats';
import {
  ProfileCapture,
  createInspectorSession,
  type CpuProfile,
  type InspectorSession,
} from './profile_capture';
import { summarizeProfile, type CallerSummary, type KibanaFrameSummary } from './profile_summary';
import type {
  BlockLogMeta,
  CaptureStopReason,
  Phase,
  ProfileLogMeta,
  ProfilingStats,
  StatsLogMeta,
  WatchdogWorkerData,
} from './types';
import { POLL_INTERVAL_MS, Slot, WATCHDOG_WORKER_NAME, monotonicUs } from './constants';

export interface WatchdogWorkerDeps {
  logger: WorkerLogger;
  /** Monotonic clock in microseconds, the same clock the main thread stamps. */
  nowUs?: () => number;
  heapUsed?: () => number;
  createSession?: () => InspectorSession;
  /** `workerData` is for startup values that may vary between runs; the worker can determine `REPO_ROOT` itself. */
  root?: string;
}

interface Capture {
  profiler: ProfileCapture;
  phase: Phase;
  blockStartedAt: number;
  requestedAt: number;
  /** Rejects when the profiler fails to start; the start handler counts and ends that capture. */
  started: Promise<void>;
  /** Set once the profiler is sampling: the main thread's cold start. */
  profilerStartMs?: number;
  /** Start of the capture time not yet added to the stats period's active time. */
  activeFrom: number;
  /** Set when the stop is requested. */
  stopReason?: CaptureStopReason;
  /** When `Profiler.stop` was sent (milliseconds). */
  stopRequestedAt?: number;
  /** When the block ended (milliseconds); only set for `block_ended`. */
  blockEndedAt?: number;
  /** Largest heartbeat gap seen since a `block_ended` stop was requested. */
  stopHeartbeatGapMs: number;
}

const toMs = (us: number): number => Math.floor(us / 1000);
const blocks = (count: number): string => `${count} ${count === 1 ? 'block' : 'blocks'}`;
const noCaptures = (): ProfilingStats => ({
  pastStartAfter: 0,
  profiled: 0,
  emptyTooLate: 0,
  captureFailed: 0,
  skippedCooldown: 0,
  profilingActiveMs: 0,
  maxStopHeartbeatGapMs: 0,
});
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Time from the first sample to the block's end (`block_ended`) or to the stop (`max_duration`). */
const sampledMs = ({ startTime, endTime, timeDeltas }: CpuProfile, untilUs = endTime): number =>
  timeDeltas?.length ? Math.max(0, toMs(untilUs - (startTime + timeDeltas[0]))) : 0;

const formatFrame = ({ name, location }: CallerSummary): string =>
  location === undefined ? name : `${name} (${location})`;

const formatTopKibanaSuffix = (frame: KibanaFrameSummary | undefined): string => {
  if (!frame) {
    return '';
  }
  const chain = [formatFrame(frame), ...frame.callers.map(formatFrame)].join(' <- ');
  return `; top Kibana frame: ${frame.percent}% ${chain}`;
};

/** Starts detection; returns a function that stops it (for tests: the worker never stops itself). */
export const runWatchdogWorker = (
  { shared: sharedBuffer, thresholdsMs, statsIntervalMs, profiling }: WatchdogWorkerData,
  {
    logger,
    nowUs = monotonicUs,
    heapUsed = () => getHeapStatistics().used_heap_size,
    createSession = createInspectorSession,
    root = REPO_ROOT,
  }: WatchdogWorkerDeps
): (() => void) => {
  const shared = new BigInt64Array(sharedBuffer);
  const detector = new BlockDetector();
  const stats = new BlockStats(thresholdsMs, toMs(nowUs()));
  let reportedDroppedLogLines = logger.getDroppedLogLineCount();
  let counts = noCaptures();
  let capture: Capture | undefined;
  let lastCaptureEndedAt: number | undefined;
  /** Start of the last block profiled: one capture per block, however long it lasts. */
  let lastProfiledBlock: number | undefined;
  let cooldownSkippedBlock: number | undefined;
  /** Ending a capture's session at shutdown rejects its pending commands; that isn't a failure. */
  let stopped = false;

  /** Phase of a heartbeat: running once the main thread has marked it. */
  const phaseAt = (heartbeatUs: number): Phase => {
    const runningSince = Number(Atomics.load(shared, Slot.runningSince));
    return runningSince > 0 && heartbeatUs >= runningSince ? 'running' : 'starting';
  };

  const onBlock = (block: DetectedBlock, nowMs: number) => {
    // A block counts once, when it ends.
    if (!block.ongoing) {
      stats.record(block);
      if (block.blockedMs >= profiling.startAfterMs[block.phase]) {
        counts.pastStartAfter++;
      }
      // A block can outlast the cooldown and be profiled after all.
      if (block.startedAt === cooldownSkippedBlock && block.startedAt !== lastProfiledBlock) {
        counts.skippedCooldown++;
      }
    }
    if (!block.report) {
      return;
    }
    const { blockedMs, startedAt, phase, suppressedBlocks, ongoing } = block;
    logger.warn<BlockLogMeta>(
      `Event loop blocked for ~${blockedMs}ms${ongoing ? ' so far' : ''}${
        suppressedBlocks ? `; ${blocks(suppressedBlocks)} before it not reported` : ''
      }`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            blockedMs,
            // Measured back from now, so a wall-clock step can't shift it.
            startedAt: new Date(Date.now() - (nowMs - startedAt)).toISOString(),
            phase,
            suppressedBlocks,
            ongoing,
          },
        },
      }
    );
  };

  /** Time since the last heartbeat; includes up to one heartbeat interval even when idle. */
  const heartbeatGapMs = (nowMs: number): number =>
    Math.max(0, nowMs - toMs(Number(Atomics.load(shared, Slot.heartbeat))));

  const endCapture = (current: Capture) => {
    current.profiler.dispose();
    if (capture === current) {
      capture = undefined;
      lastCaptureEndedAt = toMs(nowUs());
      counts.profilingActiveMs += lastCaptureEndedAt - current.activeFrom;
    }
  };

  const startCapture = (blockStartedAt: number, phase: Phase, nowMs: number) => {
    lastProfiledBlock = blockStartedAt;
    let profiler: ProfileCapture;
    try {
      profiler = new ProfileCapture(createSession);
    } catch (error) {
      lastCaptureEndedAt = nowMs;
      onStartFailed(error);
      return;
    }
    const current: Capture = {
      profiler,
      phase,
      blockStartedAt,
      requestedAt: nowMs,
      started: profiler.start(),
      activeFrom: nowMs,
      stopHeartbeatGapMs: 0,
    };
    capture = current;
    current.started.then(
      () => {
        current.profilerStartMs = toMs(nowUs()) - current.requestedAt;
      },
      (error) => {
        endCapture(current);
        onStartFailed(error);
      }
    );
  };

  const onStartFailed = (error: unknown) => {
    if (stopped) {
      return;
    }
    counts.captureFailed++;
    logger.warn(`Failed to start profiling an event loop block: ${errorMessage(error)}`, {
      tags: ['event-loop-watchdog'],
    });
  };

  const stopCapture = (
    current: Capture,
    stopReason: CaptureStopReason,
    blockedMs: number,
    blockEndedAt?: number
  ) => {
    current.stopReason = stopReason;
    current.blockEndedAt = blockEndedAt;
    current.started
      .then(
        () => {
          current.stopRequestedAt = toMs(nowUs());
          return current.profiler.stop().then(
            (profile) => onProfile(current, profile, stopReason, blockedMs),
            (error) => {
              if (stopped) {
                return;
              }
              counts.captureFailed++;
              logger.error(
                `Failed to process an event loop block profile: ${errorMessage(error)}`,
                { tags: ['event-loop-watchdog'] }
              );
            }
          );
        },
        // A capture that failed to start was counted and ended by the start handler.
        () => undefined
      )
      .finally(() => endCapture(current));
  };

  const onProfile = (
    current: Capture,
    profile: CpuProfile,
    stopReason: CaptureStopReason,
    blockedMs: number
  ) => {
    const nowMs = toMs(nowUs());
    const {
      phase,
      blockStartedAt,
      requestedAt,
      profilerStartMs = 0,
      stopRequestedAt = requestedAt,
      blockEndedAt,
    } = current;
    // The profile's clock can be offset from the heartbeat clock, so anchor the block's end to
    // `endTime` and the stop request. For `max_duration`, the block is still going at the stop.
    const inBlockUntilUs =
      stopReason === 'block_ended' && blockEndedAt !== undefined
        ? profile.endTime - (stopRequestedAt - blockEndedAt) * 1000
        : undefined;
    let summary;
    try {
      summary = summarizeProfile(profile, { root, inBlockUntilUs });
    } catch (error) {
      counts.captureFailed++;
      logger.error(`Failed to process an event loop block profile: ${errorMessage(error)}`, {
        tags: ['event-loop-watchdog'],
      });
      return;
    }
    // Read after summarising while the profile is still held, so it includes both.
    const heap = heapUsed();
    if (summary.samples > 0) {
      counts.profiled++;
    } else {
      counts.emptyTooLate++;
    }
    const profiledAfterMs = requestedAt - blockStartedAt;
    const sampled = sampledMs(profile, inBlockUntilUs);
    const coverage = blockedMs > 0 ? Math.min(1, Math.round((sampled / blockedMs) * 100) / 100) : 0;
    // After a block ends, the stop and the profile's serialisation are main-thread work. A
    // max-duration stop happens during the block, so its gap is the block itself.
    let stopHeartbeatGapMs: number | undefined;
    if (stopReason === 'block_ended') {
      stopHeartbeatGapMs = Math.max(current.stopHeartbeatGapMs, heartbeatGapMs(nowMs));
      counts.maxStopHeartbeatGapMs = Math.max(counts.maxStopHeartbeatGapMs, stopHeartbeatGapMs);
    }
    logger.info<ProfileLogMeta>(
      `Event loop block profiled: block ~${blockedMs}ms${
        stopReason === 'block_ended' ? '' : ' so far'
      } (profiled after ~${profiledAfterMs}ms, profiler start took ~${profilerStartMs}ms), ${
        summary.samples
      } samples; stopped: ${stopReason}${formatTopKibanaSuffix(summary.kibanaFrames[0])}`,
      {
        tags: ['event-loop-watchdog'],
        kibana: {
          event_loop_watchdog: {
            profile: {
              phase,
              blockedMs,
              profiledAfterMs,
              profilerStartMs,
              sampledMs: sampled,
              coverage,
              captureDurationMs: nowMs - requestedAt,
              ...summary,
              nodes: profile.nodes.length,
              heapUsed: heap,
              stopReason,
              ...(stopHeartbeatGapMs === undefined ? {} : { stopHeartbeatGapMs }),
            },
          },
        },
      }
    );
  };

  /** Starts or stops a capture after each poll; `ended` is the block this poll saw end. */
  const updateCapture = (nowMs: number, ended: DetectedBlock | undefined) => {
    const block = detector.current;
    // A profiling flag change can't reach a running capture: captures only run during a block,
    // and the main thread handles flag changes. The slot only gates starting one.
    if (capture) {
      if (capture.stopReason) {
        return;
      }
      if (block?.startedAt !== capture.blockStartedAt) {
        // Only the block this capture belongs to can have ended since the last poll.
        stopCapture(
          capture,
          'block_ended',
          ended?.blockedMs ?? nowMs - capture.blockStartedAt,
          ended?.endedAt ?? nowMs
        );
      } else if (nowMs - capture.requestedAt >= profiling.maxDurationMs[capture.phase]) {
        // Still blocked: keep what was sampled so far.
        stopCapture(capture, 'max_duration', nowMs - capture.blockStartedAt);
      }
      return;
    }
    const profilingOn = Atomics.load(shared, Slot.profiling) === 1n;
    if (
      !profilingOn ||
      !block ||
      block.startedAt === lastProfiledBlock ||
      nowMs - block.startedAt < profiling.startAfterMs[block.phase]
    ) {
      return;
    }
    if (
      lastCaptureEndedAt !== undefined &&
      nowMs - lastCaptureEndedAt < profiling.cooldownMs[block.phase]
    ) {
      cooldownSkippedBlock = block.startedAt;
      return;
    }
    startCapture(block.startedAt, block.phase, nowMs);
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
    if (capture?.stopReason === 'block_ended') {
      capture.stopHeartbeatGapMs = Math.max(capture.stopHeartbeatGapMs, heartbeatGapMs(nowMs));
    }
    updateCapture(nowMs, block && !block.ongoing ? block : undefined);
  };

  const writeStats = () => {
    const now = toMs(nowUs());
    // A capture still running splits its active time across the stats periods it spans.
    if (capture) {
      counts.profilingActiveMs += now - capture.activeFrom;
      capture.activeFrom = now;
    }
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
              profiling: counts,
            },
          },
        },
      }
    );
    // A lost stats log line keeps its counts for the next one, so the sums stay right.
    if (logger.getDroppedLogLineCount() === droppedBefore) {
      stats.reset(now);
      counts = noCaptures();
      reportedDroppedLogLines = droppedBefore;
    }
  };

  // The poll interval is also what keeps this worker alive, so keep it referenced.
  const pollTimer = setInterval(poll, POLL_INTERVAL_MS);
  const statsTimer = setInterval(writeStats, statsIntervalMs);

  return () => {
    stopped = true;
    clearInterval(pollTimer);
    clearInterval(statsTimer);
    if (capture) {
      endCapture(capture);
    }
  };
};

if (!isMainThread) {
  const { data } = workerData as { data: WatchdogWorkerData };
  runWatchdogWorker(data, { logger: createWorkerLogger(data.logging, WATCHDOG_WORKER_NAME) });
}
