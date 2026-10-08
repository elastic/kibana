/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogMeta } from '@kbn/logging';
import type { AdmissionLimits } from './admission';

export const WATCHDOG_WORKER_NAME = 'event-loop-watchdog';

// Hardcoded PoC settings.
export const HEARTBEAT_INTERVAL_MS = 50;
export const BLOCK_THRESHOLD_MS = 200;
export const POLL_INTERVAL_MS = 25;
/** 99 Hz, as Datadog's tracer: avoids sampling in lockstep with 10ms timers. */
export const SAMPLING_INTERVAL_US = Math.round(1_000_000 / 99);
/** V8's default `--cpu-profiler-sampling-interval`, restored once the profiler exists. */
export const V8_DEFAULT_SAMPLING_INTERVAL_US = 1_000;
export const WINDOW_MS = 60_000;
/** A window holding a block is rotated early, but never before it is this old. */
export const MIN_FLAGGED_WINDOW_MS = 10_000;
export const MAX_SESSION_MS = 2 * 60 * 60 * 1000;
/** Files are written for windows holding one of this many largest blocks written so far... */
export const MAX_LARGEST_FILES = 10;
/** ...exceeding the smallest of them by this factor once ranked (records: the largest). */
export const MIN_BLOCK_GROWTH = 1.25;
/** Files written for ranking; the rest of the cap is reserved for records. */
export const MAX_RANKED_FILES = 70;
/** Safety cap on files written per worker. */
export const MAX_WRITTEN_FILES = 100;
/** Startup windows are written only for a new largest startup block, at most this many. */
export const MAX_STARTUP_FILES = 10;
/** Kibana is considered running this long after its overall status first becomes available... */
export const RUNNING_GRACE_MS = 30_000;
/** ...or this long after the watchdog service starts, whichever comes first. */
export const RUNNING_FALLBACK_MS = 5 * 60_000;

/** Startup blocks are expected (and seen before serving traffic); they get their own budget. */
export type Phase = 'startup' | 'running';

/** Samples within this margin of a block are written as context; the rest of the window is not. */
export const CONTEXT_MARGIN_MS = 1_000;

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
  /** When Kibana was considered running (0 while starting up); blocks before it are startup. */
  runningSince: 5,
} as const;
export const SLOT_COUNT = 6;
/** Longest the main thread defers rotation after a stall, waiting for the worker to classify it. */
export const MAX_CLASSIFY_WAIT_MS = 2_000;

export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);

export interface WatchdogWorkerData {
  shared: SharedArrayBuffer;
  sanitizeRoot: string;
  diagnosticDir?: string;
  admissionLimits?: AdmissionLimits;
}

export interface ProfileMessage {
  type: 'profile';
  /** The window's V8 CPU profile (`.cpuprofile` JSON), as returned by the profiler. */
  json: string;
  /** Monotonic time (`process.hrtime`) right after the profile was stopped, to map V8's clock. */
  stoppedAtUs: number;
  windowStartUs: number;
  windowEndUs: number;
  /** Number of windows kept so far in the session, including this one. */
  kept: number;
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
