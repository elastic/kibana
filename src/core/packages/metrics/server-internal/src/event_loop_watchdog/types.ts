/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogMeta } from '@kbn/logging';

export const WATCHDOG_WORKER_NAME = 'event-loop-watchdog';

// Hardcoded PoC settings.
export const HEARTBEAT_INTERVAL_MS = 50;
export const BLOCK_THRESHOLD_MS = 200;
export const POLL_INTERVAL_MS = 25;
/** 99 Hz, as Datadog's tracer: avoids sampling in lockstep with 10ms timers. */
export const SAMPLING_INTERVAL_US = Math.round(1_000_000 / 99);
export const WINDOW_MS = 60_000;
/** A window holding a block is rotated early, but never before it is this old. */
export const MIN_FLAGGED_WINDOW_MS = 10_000;
export const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
export const MAX_KEPT_PROFILES = 100;

/** Label holding each sample's epoch timestamp in microseconds, to locate blocks in a window. */
export const TIMESTAMP_LABEL = 'timestamp_us';
/** Label numbering the block (1-based, in logged order) a written sample was taken in. */
export const BLOCK_LABEL = 'block';
/** Samples within this margin of a block are written as context; the rest of the window is not. */
export const CONTEXT_MARGIN_MS = 1_000;
export const OUTER_CONTEXT_LABEL = 'context_outer';
export const INNER_CONTEXT_LABEL = 'context_inner';

/**
 * Slots of the BigInt64Array shared by the main thread and the worker. Times are process-wide
 * monotonic microseconds (`process.hrtime`).
 */
export const Slot = {
  /** Stamped by the main thread every heartbeat interval. */
  heartbeat: 0,
  /** Incremented by the worker for each block not caused by the profiler. */
  blocks: 1,
  /** Written by the main thread around each profile rotation. */
  rotationStart: 2,
  rotationEnd: 3,
  /** Last heartbeat the worker has classified, published after counting any block it ended. */
  classified: 4,
} as const;
export const SLOT_COUNT = 5;
/** Longest the main thread defers rotation after a stall, waiting for the worker to classify it. */
export const MAX_CLASSIFY_WAIT_MS = 2_000;

export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);

export interface WatchdogWorkerData {
  shared: SharedArrayBuffer;
  sanitizeRoot: string;
  diagnosticDir?: string;
}

export interface ProfileMessage {
  type: 'profile';
  bytes: Uint8Array;
  windowStartUs: number;
  windowEndUs: number;
  /** e.g. `3/100` */
  kept: string;
}
export type MainToWorkerMessage = ProfileMessage;

export interface WatchdogLogMeta extends LogMeta {
  kibana: { event_loop_watchdog: Record<string, unknown> };
}

export interface LogMessage {
  type: 'log';
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: WatchdogLogMeta;
}
export type WorkerToMainMessage = LogMessage;
