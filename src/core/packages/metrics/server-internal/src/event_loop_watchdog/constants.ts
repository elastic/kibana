/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const WATCHDOG_WORKER_NAME = 'event-loop-watchdog';

/** How often the main thread stamps its heartbeat. */
export const HEARTBEAT_INTERVAL_MS = 50;
/** How often the worker reads the heartbeat: half the heartbeat interval. */
export const POLL_INTERVAL_MS = 25;

/** Block warnings that may be logged in a burst before the rate limit applies. */
export const REPORT_BURST = 5;
/** Interval at which one warning is allowed again once the burst is used up. */
export const REPORT_REFILL_MS = 60_000;

/** Kibana is considered running this long after its overall status first becomes available... */
export const RUNNING_GRACE_MS = 30_000;
/** ...or this long after the watchdog service starts, whichever comes first. */
export const RUNNING_FALLBACK_MS = 5 * 60_000;

/**
 * Slots of the BigInt64Array shared by the main thread and the worker. Times are process-wide
 * monotonic microseconds (`process.hrtime`).
 */
export const Slot = {
  /** Stamped by the main thread every heartbeat interval. */
  heartbeat: 0,
  /** When Kibana was considered running (0 while starting); blocks before it are `starting`. */
  runningSince: 1,
} as const;
export const SLOT_COUNT = 2;

export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);
