/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Class used to signify that something was aborted. Useful for applications to conditionally handle
 * this type of error differently than other errors.
 */
export class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message);
    this.message = message;
    this.name = 'AbortError';
  }
}

/**
 * Returns a `Promise` corresponding with when the given `AbortSignal` is aborted. Useful for
 * situations when you might need to `Promise.race` multiple `AbortSignal`s, or an `AbortSignal`
 * with any other expected errors (or completions).
 *
 * @param signal The `AbortSignal` to generate the `Promise` from
 */
export function abortSignalToPromise(signal: AbortSignal): {
  promise: Promise<never>;
  cleanup: () => void;
} {
  let abortHandler: () => void;
  const cleanup = () => {
    if (abortHandler) {
      signal.removeEventListener('abort', abortHandler);
    }
  };
  const promise = new Promise<never>((resolve, reject) => {
    if (signal.aborted) reject(new AbortError());
    abortHandler = () => {
      cleanup();
      reject(new AbortError());
    };
    signal.addEventListener('abort', abortHandler);
  });

  return { promise, cleanup };
}
