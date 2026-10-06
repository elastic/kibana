/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare enum AbortReason {
  /**
   * The request was aborted due to reaching the `search:timeout` advanced setting.
   */
  TIMEOUT = 'timeout',
  /**
   * The request was aborted because the data was replaced by a new request (refreshed/re-fetched).
   */
  REPLACED = 'replaced',
  /**
   * The request was aborted because the component unmounted or the execution context was destroyed.
   */
  CLEANUP = 'cleanup',
  /**
   * The request was aborted because the user explicitly canceled it.
   */
  CANCELED = 'canceled',
}
/**
 * Class used to signify that something was aborted. Useful for applications to conditionally handle
 * this type of error differently than other errors.
 */
export declare class AbortError extends Error {
  constructor(message?: string);
}
/**
 * Returns a `Promise` corresponding with when the given `AbortSignal` is aborted. Useful for
 * situations when you might need to `Promise.race` multiple `AbortSignal`s, or an `AbortSignal`
 * with any other expected errors (or completions).
 *
 * @param signal The `AbortSignal` to generate the `Promise` from
 */
export declare function abortSignalToPromise(signal: AbortSignal): {
  promise: Promise<never>;
  cleanup: () => void;
};
