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

  return ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    const time = now();

    if (forceRefresh || time - lastCallTime > maxCacheDuration) {
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

interface CacheEntry<T> {
  value: Promise<T>;
  lastCallTime: number;
}

/**
 * Caches the result of an async function based on its arguments.
 *
 * @param fn Function to call to get the value.
 * @param getKey Function to generate a unique cache key from the arguments.
 * @param maxCacheDuration For how long to keep a value in the cache,
 * in milliseconds. Defaults to 5 minutes.
 * @param refreshAfter Minimum time between cache refreshes, in milliseconds.
 * Defaults to 15 seconds.
 * @param now Function which returns the current time in milliseconds, defaults to `Date.now`.
 * @returns A function which returns the cached value.
 */
export const cacheParametrizedAsyncFunction = <Args extends any[], T>(
  fn: (...args: Args) => Promise<T>,
  getKey: (...args: Args) => string = (...args) => JSON.stringify(args),
  maxCacheDuration: number = 1000 * 60 * 5,
  refreshAfter: number = 1000 * 15,
  now: () => number = Date.now
) => {
  const cache = new Map<string, CacheEntry<T>>();

  /**
   * It's possible to force a refresh by calling the function with
   * `{ forceRefresh: true }` as `this` context.
   *
   * @example fn.call({ forceRefresh: true }, ...args);
   */
  return function (this: { forceRefresh?: boolean } | undefined | void, ...args: Args): Promise<T> {
    const forceRefresh = this?.forceRefresh ?? false;
    const key = getKey(...args);

    if (forceRefresh) {
      const newValue = fn(...args);
      cache.set(key, { value: newValue, lastCallTime: now() });
      return newValue;
    }

    const time = now();
    let entry = cache.get(key);

    // If no entry or cache expired
    if (!entry || time - entry.lastCallTime > maxCacheDuration) {
      const newValue = fn(...args);
      entry = { value: newValue, lastCallTime: time };
      cache.set(key, entry);
      return newValue;
    }

    // If entry exists, but needs refresh
    if (time - entry.lastCallTime > refreshAfter) {
      // Refresh in the background
      Promise.resolve().then(async () => {
        const refreshedValue = await fn(...args);
        cache.set(key, { value: Promise.resolve(refreshedValue), lastCallTime: now() });
      });
    }

    return entry.value;
  };
};
