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
 * Time threshold that distinguishes short-lived blocks from ongoing blocks.
 * Blocks shorter than this are reported once after they end.
 * Blocks lasting this long or longer are reported as ongoing, with elapsed time,
 * and repeated until they end or the process terminates.
 */
export const ONGOING_REPORT_AFTER_MS = 2_000;
/** Ongoing reports repeat this often while the block is shorter than the next constant... */
export const ONGOING_REPEAT_MS = 3_000;
/** ...and every REPORT_REFILL_MS after that. */
export const ONGOING_FAST_REPEATS_UNTIL_MS = 12_000;

/** CPU profiler sampling interval in microseconds: about 99 Hz. */
export const SAMPLING_INTERVAL_US = 10_101;

/** A block's execution context is first sampled once the block has lasted this long... */
export const CONTEXT_SAMPLE_AFTER_MS = 1_000;
/** ...then this often... */
export const CONTEXT_SAMPLE_INTERVAL_MS = 500;
/** ...up to this many samples, which covers the first 20 seconds of a block. */
export const MAX_CONTEXT_SAMPLES = 40;
/** Execution contexts kept per block: the most sampled ones... */
export const MAX_REPORTED_CONTEXTS = 5;
/** ...of which a block's log line lists this many, to stay within the logger's line limit. */
export const MAX_LOGGED_CONTEXTS = 3;
/** Longest `type`, `name` or `id` kept from an execution context. */
export const MAX_CONTEXT_FIELD_LENGTH = 80;
/**
 * Key of the global function that returns the running code's execution context. The main thread
 * installs it under `Symbol.for(key)`; the worker calls it there through the inspector.
 */
export const CONTEXT_READER_KEY = 'kbn.core.eventLoopWatchdog.readExecutionContext';
/** Key of the messages the worker posts to the main thread, one per block that ended. */
export const BLOCK_MESSAGE_KEY = '__kbnEventLoopBlock';

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
  /** 1 while CPU profiling is on for one of this node's roles, 0 otherwise. */
  profiling: 2,
} as const;
export const SLOT_COUNT = 3;

export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);
