/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Given a non-parametrized async function, returns a function which caches the
 * result of that function. When a cached value is available, it returns
 * immediately that value and refreshes the cache in the background. When the
 * cached value is too old, it is discarded and the function is called again.
 *
 * @param fn Function to call to get the value.
 * @param maxCacheDuration For how long to keep a value in the cache,
 *     in milliseconds. Defaults to 5 minutes.
 * @param refreshAfter Minimum time between cache refreshes, in milliseconds.
 *     Defaults to 15 seconds.
 * @param now Function which returns the current time in milliseconds, defaults to `Date.now`.
 * @returns A function which returns the cached value.
 */
export const cacheNonParametrizedAsyncFunction = <T>(
  fn: () => Promise<T>,
  maxCacheDuration: number = 1000 * 60 * 5,
  refreshAfter: number = 1000 * 15,
  now: () => number = Date.now
) => {
  let lastCallTime = 0;
  let value: Promise<T> | undefined;

  return () => {
    const time = now();

    if (time - lastCallTime > maxCacheDuration) {
      value = undefined;
    }

    if (!value) {
      lastCallTime = time;
      value = fn();

      return value;
    }

    if (time - lastCallTime > refreshAfter) {
      lastCallTime = time;
      Promise.resolve().then(() => {
        value = fn();
      });
    }

    return value;
  };
};
