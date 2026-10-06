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
export declare const cacheParametrizedAsyncFunction: <Args extends any[], T>(fn: (...args: Args) => Promise<T>, getKey?: (...args: Args) => string, maxCacheDuration?: number, refreshAfter?: number, now?: () => number) => (this: {
    forceRefresh?: boolean;
} | undefined | void, ...args: Args) => Promise<T>;
