/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogMeta } from '@kbn/logging';
import type { WorkerLoggingConfig } from '@kbn/core-threads-server-internal';
import type { BlockStatsSnapshot } from './block_stats';

/** Startup is noisier than steady state, so blocks are counted per phase. */
export type Phase = 'starting' | 'running';

export interface WatchdogProfilingData {
  startAfterMs: Readonly<Record<Phase, number>>;
  maxDurationMs: Readonly<Record<Phase, number>>;
  cooldownMs: Readonly<Record<Phase, number>>;
  /** Where profiles are written. Unset when Node has no diagnostic directory. */
  diagnosticDir?: string;
}

/** Passed to the worker as `workerData.data`. */
export interface WatchdogWorkerData {
  shared: SharedArrayBuffer;
  thresholdsMs: Readonly<Record<Phase, number>>;
  statsIntervalMs: number;
  logging: WorkerLoggingConfig;
  profiling: WatchdogProfilingData;
}

export interface BlockLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      blockedMs: number;
      startedAt: string;
      phase: Phase;
      suppressedBlocks: number;
      /** True when the block was still ongoing at log time; `blockedMs` is its length so far. */
      ongoing: boolean;
    };
  };
}

/** Why a capture stopped. */
export type CaptureStopReason = 'block_ended' | 'max_duration';

export interface ProfileLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      profile: {
        phase: Phase;
        /** The block's length at the stop; still growing unless `stopReason` is `block_ended`. */
        blockedMs: number;
        /** How far into the block profiling was requested. */
        profiledAfterMs: number;
        /** Time from the request until the profiler was sampling: the main thread's cold start. */
        profilerStartMs: number;
        /** Time from the first sample to the stop. */
        sampledMs: number;
        /** Share of the block, as of the stop, covered by samples: `sampledMs / blockedMs`, at most 1. */
        coverage: number;
        /** Time from the request until the profile reached the worker. */
        profilingActiveMs: number;
        /** Number of CPU samples in the profile. */
        samples: number;
        /** Number of distinct call-stack frames in the profile. */
        nodes: number;
        /** The worker's heap in bytes while it holds the profile. */
        heapUsed: number;
        stopReason: CaptureStopReason;
        /**
         * Largest heartbeat gap between the block's end and the profile reaching the worker: the
         * main-thread cost of the stop. Only set for `block_ended`.
         */
        stopHeartbeatGapMs?: number;
      };
    };
  };
}

/** Profiling counts and times for a stats period. */
export interface ProfilingStats {
  /**
   * Blocks that ended at or past `startAfter`, whether profiling was on or not. With profiling on,
   * more of these than captures means some long blocks weren't profiled. A capture is counted when
   * its profile arrives, just after its block ends, so the two can land in different periods.
   */
  pastStartAfter: number;
  /** Captures with at least one sample outside `(idle)`. */
  profiled: number;
  /**
   * Captures with no samples outside `(idle)`, usually because the block ended while the profiler
   * was starting. A capture whose busy samples all come after the block still counts as `profiled`:
   * sample times aren't compared with the block's end yet.
   */
  emptyTooLate: number;
  /** Captures that failed to start or to stop. */
  captureFailed: number;
  /** Blocks past `startAfter` that ended without a capture because of the cooldown. */
  skippedCooldown: number;
  /**
   * Time captures were running in the period, from each request until its profile reached the
   * worker. Event loop utilization (ELU) rises while a capture runs; compare the two with this.
   */
  profilingActiveMs: number;
  /** Largest `stopHeartbeatGapMs` of the captures that ended in the period. */
  maxStopHeartbeatGapMs: number;
}

export interface StatsLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      stats: BlockStatsSnapshot & {
        /** The worker's own heap, so its memory use is visible. */
        heapUsed: number;
        /** Worker log lines lost since the last stats log line that was written. */
        droppedLogLines: number;
        profiling: ProfilingStats;
      };
    };
  };
}
