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

/** Passed to the worker as `workerData.data`. */
export interface WatchdogWorkerData {
  shared: SharedArrayBuffer;
  thresholdsMs: Readonly<Record<Phase, number>>;
  statsIntervalMs: number;
  logging: WorkerLoggingConfig;
}

export interface BlockLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      blockedMs: number;
      startedAt: string;
      phase: Phase;
      suppressedBlocks: number;
    };
  };
}

export interface StatsLogMeta extends LogMeta {
  kibana: {
    event_loop_watchdog: {
      stats: BlockStatsSnapshot & {
        /** The worker's own heap, so its memory use is visible. */
        heapUsed: number;
        /** Worker log lines lost since the last stats log line that was written. */
        droppedLogLines: number;
      };
    };
  };
}
