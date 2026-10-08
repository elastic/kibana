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
/** A block is profiled once it has lasted this long: egregious blocks only, not jitter. */
export const PROFILE_AFTER_MS = 2_000;
/** A profile stops when its block ends, or after this long. */
export const MAX_PROFILE_MS = 10_000;
/** At most one profile per this interval (counted from its start). */
export const PROFILE_COOLDOWN_MS = 60_000;
/** 99 Hz, as Datadog's tracer: avoids sampling in lockstep with 10ms timers. */
export const SAMPLING_INTERVAL_US = Math.round(1_000_000 / 99);
/** Files are written for blocks among this many largest written so far... */
export const MAX_LARGEST_FILES = 10;
/** ...exceeding the smallest of them by this factor once ranked (records: the largest). */
export const MIN_BLOCK_GROWTH = 1.25;
/** Files written for ranking; the rest of the cap is reserved for records. */
export const MAX_RANKED_FILES = 70;
/** Safety cap on files written per worker. */
export const MAX_WRITTEN_FILES = 100;
/** Startup blocks are written only for a new largest startup block, at most this many. */
export const MAX_STARTUP_FILES = 10;
/** Kibana is considered running this long after its overall status first becomes available... */
export const RUNNING_GRACE_MS = 30_000;
/** ...or this long after the watchdog service starts, whichever comes first. */
export const RUNNING_FALLBACK_MS = 5 * 60_000;

/** Startup blocks are expected (and seen before serving traffic); they get their own budget. */
export type Phase = 'startup' | 'running';

/**
 * Slots of the BigInt64Array shared by the main thread and the worker. Times are process-wide
 * monotonic microseconds (`process.hrtime`).
 */
export const Slot = {
  /** Stamped by the main thread every heartbeat interval. */
  heartbeat: 0,
  /** When Kibana was considered running (0 while starting up); blocks before it are startup. */
  runningSince: 1,
} as const;
export const SLOT_COUNT = 2;

export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);

export interface WatchdogWorkerData {
  shared: SharedArrayBuffer;
  sanitizeRoot: string;
  diagnosticDir?: string;
  admissionLimits?: AdmissionLimits;
  /** Overrides of the profiling thresholds, for tests. */
  profiling?: { afterMs: number; maxMs: number; cooldownMs: number };
}

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
/** The main thread sends nothing: the worker profiles it through an inspector session. */
export type MainToWorkerMessage = never;
