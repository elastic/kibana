import type { FilterFn } from './types';
export declare const RESIZE_OBSERVER_LOOP_ERROR = "ResizeObserver loop completed with undelivered notifications.";
/**
 * Errors are matched on `exception.message` only. The browser dispatches these as bare
 * `error` events without an `Error` object, so the RUM agent has no name to derive
 * `exception.type` from and reports it as an empty string.
 */
export declare const IGNORED_ERROR_MESSAGES: string[];
/** Drops errors reported by the browser that are known to be benign. */
export declare const ignoredErrorsFilter: FilterFn;
