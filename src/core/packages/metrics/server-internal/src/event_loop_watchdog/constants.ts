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

/**
 * A block still ongoing after this long (or after the phase threshold, if that is longer) is
 * reported before it ends, so a block that outlives the process still leaves a log line.
 * Ongoing reports don't take end-of-block tokens, so short blocks can't suppress them. Only the
 * first ongoing report of a block takes a token, from its own bucket (ONGOING_REPORT_BURST); when
 * it's denied, the block's first fast repeat reports instead. Repeats take no token: one block
 * logs at most 5 ongoing reports in its first 15 s, then one every REPORT_REFILL_MS.
 */
export const ONGOING_REPORT_AFTER_MS = 1_000;
/** First ongoing reports that may be logged in a burst; same value as REPORT_BURST, own state. */
export const ONGOING_REPORT_BURST = REPORT_BURST;
/** Interval at which one first ongoing report is allowed again once its burst is used up. */
export const ONGOING_REPORT_REFILL_MS = REPORT_REFILL_MS;
/** Ongoing reports repeat this often early in a block, while a liveness probe may still kill it. */
export const ONGOING_FAST_REPEAT_MS = 3_000;
/** No fast repeat is due later than this into a block; later repeats are REPORT_REFILL_MS apart. */
export const ONGOING_FAST_REPEAT_UNTIL_MS = 15_000;

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
