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
import type { ProfileSummary } from './profile_summary';

/** Startup is noisier than steady state, so blocks are counted per phase. */
export type Phase = 'starting' | 'running';

/**
 * Whether a capture may write a profile file:
 * - `admitted`: the first capture this clock hour for its top frame, while the hour has slots left.
 * - `same_frame`: this clock hour already admitted a capture with the same top frame.
 * - `hour_limit`: this clock hour already admitted `FILES_PER_HOUR` captures.
 */
export type AdmissionOutcome = 'admitted' | 'same_frame' | 'hour_limit';

export interface WatchdogProfilingData {
  startAfterMs: Readonly<Record<Phase, number>>;
  maxDurationMs: Readonly<Record<Phase, number>>;
  cooldownMs: Readonly<Record<Phase, number>>;
  /**
   * Profile output directory from `profiling.dir` or Node's `--diagnostic-dir`; unset means no
   * profile files.
   */
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

/** Whether a capture was admitted for file output, or why no file was attempted. */
export type ProfileFileOutcome = AdmissionOutcome | 'no_directory' | 'empty';

export interface ProfileLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      profile: ProfileSummary & {
        phase: Phase;
        /** The block's length at the stop; still growing unless `stopReason` is `block_ended`. */
        blockedMs: number;
        /** How far into the block profiling was requested. */
        profiledAfterMs: number;
        /** Time from the request until the profiler was sampling: the main thread's cold start. */
        profilerStartMs: number;
        /**
         * Time from the first sample to the block's end (`block_ended`) or to the stop
         * (`max_duration`).
         */
        sampledMs: number;
        /**
         * Share of the block covered by samples: `sampledMs / blockedMs`, at most 1 (as of the stop
         * for `max_duration`).
         */
        coverage: number;
        /** Time from the request until the profile reached the worker. */
        captureDurationMs: number;
        /** Number of distinct call-stack frames in the profile. */
        nodes: number;
        /** The worker's heap in bytes after the profile is summarised. */
        heapUsed: number;
        stopReason: CaptureStopReason;
        file: ProfileFileOutcome;
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
   * its profile arrives, which can be before or after its block ends, so a block's `pastStartAfter`
   * count and its capture's `profiled` or `emptyTooLate` count can be on different stats lines.
   */
  pastStartAfter: number;
  /** Captures with at least one busy (non-idle) sample within the block. */
  profiled: number;
  /**
   * Captures with no busy (non-idle) samples within the block, usually because the block ended
   * while the profiler was starting.
   */
  emptyTooLate: number;
  /** Captures that failed to start, stop, or to summarise. */
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
  /** Profile file outcomes. Captures without samples or without a directory aren't counted. */
  files: FileCounts;
}

/** Profile file outcomes, combined across both phases. */
export interface FileCounts {
  /** Files written in full, counted when the write finishes. */
  written: number;
  /** Captures refused as duplicates within the same clock hour. */
  sameFrame: number;
  /** Captures refused as exceeding the per-hour limit. */
  hourLimit: number;
  /** Admitted captures whose write failed, counted when the write fails. */
  writeFailed: number;
}

export interface StatsLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      stats: BlockStatsSnapshot & {
        /** The worker's own heap, so its memory use is visible. */
        heapUsed: number;
        /** Worker log lines lost since the last stats log line that was written. */
        droppedLogLines: number;
        profiling: ProfilingStats & {
          /** Where profile files are written, while profiling is on; capture lines only give the file name. */
          diagnosticDir?: string;
        };
      };
    };
  };
}
