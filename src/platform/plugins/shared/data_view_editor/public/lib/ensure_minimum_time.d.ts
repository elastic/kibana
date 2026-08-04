/**
 * When you make an async request, typically you want to show the user a spinner while they wait.
 * However, if the request takes less than 300 ms, the spinner will flicker in the UI and the user
 * won't have time to register it as a spinner. This function ensures the spinner (or whatever
 * you're showing the user) displays for at least 300 ms, even if the request completes before then.
 */
export declare const DEFAULT_MINIMUM_TIME_MS = 300;
export declare function ensureMinimumTime<T>(promiseOrPromises: Promise<T> | Array<Promise<T>>, minimumTimeMs?: number): Promise<T | Awaited<T>[]>;
