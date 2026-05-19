/**
 * Accepts a callback and returns a function with a stable identity
 * that will always call the latest version of the callback when invoked
 */
export declare const useStableCallback: <T extends (...args: never[]) => unknown>(fn: T | undefined) => (...args: Parameters<T>) => unknown;
