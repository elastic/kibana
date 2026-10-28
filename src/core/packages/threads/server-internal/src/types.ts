/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MessagePort, ResourceLimits } from 'node:worker_threads';
import type { Logger } from '@kbn/logging';

/** Lifecycle state of a managed worker. */
export type ManagedWorkerState = 'stopped' | 'starting' | 'running' | 'restarting' | 'exhausted';

/** Why a worker went away without being stopped. */
export type ManagedWorkerExitReason = 'exit' | 'error' | 'oom' | 'ready_timeout';

/** A worker that never reported ready is terminated, so it has no exit code of its own. */
export type ManagedWorkerExitInfo =
  | { readonly reason: 'ready_timeout' }
  | {
      readonly reason: Exclude<ManagedWorkerExitReason, 'ready_timeout'>;
      readonly exitCode: number;
    };

export interface ManagedWorkerRestartOptions {
  /** Consecutive failed starts or crashes before the worker is exhausted. Defaults to 3. */
  readonly maxAttempts?: number;
  /** Delay before the first restart; doubles on each attempt. Defaults to 1s. */
  readonly initialDelayMs?: number;
  /** Uptime after `ready` that resets the restart counter. Defaults to 10 minutes. */
  readonly stableUptimeMs?: number;
}

export interface ManagedWorkerOptions<TData = unknown> {
  readonly name: string;
  /**
   * Absolute path of the worker entry, usually `require.resolve('./worker')`.
   * The entry must keep a ref'd handle (e.g. its poll interval) open, otherwise the worker
   * exits right after `ready` and uses up the restart budget.
   * The entry reads `workerData` from `node:worker_threads` as `workerData.data`.
   */
  readonly entry: string;
  readonly workerData?: TData;
  /**
   * Transferred to the worker as `workerData.__connectionPort`.
   * Used for an application protocol that must stay off the control channel.
   */
  readonly connectionPort?: MessagePort;
  /** Every field of Node's `ResourceLimits` is optional, so the heap cap is required here. */
  readonly resourceLimits: ResourceLimits & { readonly maxOldGenerationSizeMb: number };
  readonly logger: Logger;
  /** Whether the worker and its timers let the process exit. Defaults to true. */
  readonly unref?: boolean;
  readonly restart?: ManagedWorkerRestartOptions;
  /** Time allowed between spawn and the worker's `ready` message. Defaults to 30s. */
  readonly readyTimeoutMs?: number;
  /** Interval of the worker's heap usage reports. Defaults to 60s. */
  readonly healthIntervalMs?: number;
  /** Called when a worker goes away without `stop()`; `stop()` resolving is the stopped signal. */
  onExit?(info: ManagedWorkerExitInfo): void;
  /** Called when the restart budget is used up; `start()` can be called again afterwards. */
  onExhausted?(): void;
}

export interface ManagedWorkerStatus {
  readonly state: ManagedWorkerState;
  readonly restarts: number;
  readonly lastExitCode?: number;
  readonly threadId?: number;
  /** When the current worker reported ready. */
  readonly startedAt?: Date;
  readonly heapUsed?: number;
  /**
   * The worker's effective V8 heap limit in bytes, reported with `ready`. A process-wide
   * `--max-old-space-size` overrides `resourceLimits.maxOldGenerationSizeMb`.
   */
  readonly heapSizeLimit?: number;
}

export interface ManagedWorker {
  start(): void;
  /** Resolves when the worker reports ready. Rejects if the restart budget is exhausted first. */
  ready(): Promise<void>;
  stop(): Promise<void>;
  status(): ManagedWorkerStatus;
}
