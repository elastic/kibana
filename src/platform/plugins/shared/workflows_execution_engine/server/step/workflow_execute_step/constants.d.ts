/**
 * Initial polling interval in seconds. First wait uses this (in-process for short workflows).
 */
export declare const INITIAL_POLL_INTERVAL = 1;
/**
 * Maximum polling interval in seconds. Intervals above 5s yield to Task Manager
 * (see SHORT_DURATION_THRESHOLD in handle_execution_delay).
 */
export declare const MAX_POLL_INTERVAL = 30;
/**
 * Backoff multiplier for exponential backoff. Delays progress: 1s, 2s, 4s, 8s, 16s, 30s.
 */
export declare const BACKOFF_MULTIPLIER = 2;
/**
 * Returns the poll interval for the given poll count (exponential backoff) as a duration string.
 * Poll count 0 = INITIAL_POLL_INTERVAL, then multiplies by BACKOFF_MULTIPLIER each time, capped at MAX_POLL_INTERVAL.
 */
export declare function getNextPollInterval(pollCount: number): string;
/**
 * Maximum depth of nested workflow execution (workflow calling workflow).
 * Prevents infinite recursion and unbounded Task Manager usage.
 */
export declare const MAX_WORKFLOW_DEPTH = 10;
