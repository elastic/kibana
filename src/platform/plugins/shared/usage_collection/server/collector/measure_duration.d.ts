export declare const createPerformanceObsHook: () => () => Record<string, number>;
/**
 * A wrapper around performance.timerify which defined the name of the returned
 * wrapped function to help identify observed function types inside the `PerformanceObserver`.
 *
 * @param name name of the function used to track the performance of the function execution
 * @param fn the function to be wrapped by the performance.timerify method.
 * @returns
 */
export declare const perfTimerify: <T extends (...params: unknown[]) => unknown>(name: string, fn: T) => T;
