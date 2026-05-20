export interface DebounceOptions {
    wait?: number;
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}
/**
 * Custom hook that returns a React safe debounced version of the provided function.
 *
 * @param {Function} fn - The function to debounce.
 * @param {Object} [options] - Optional configuration options for debounce.
 * @param {number} [options.wait=1000] - The number of milliseconds to delay.
 * @param {boolean} [options.leading=false] - Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true] - Specify invoking on the trailing edge of the timeout.
 * @param {number} [options.maxWait] - The maximum time `fn` is allowed to be delayed before it's invoked.
 *
 * @returns {Object} - An object containing the debounced function (`run`), and methods to cancel (`cancel`) or flush (`flush`) the debounce.
 *
 * @throws {Error} - Throws an error if the provided `fn` is not a function.
 *
 * @caveat The debounce does not cancel if `options` or `wait` are changed between calls.
 */
export declare function useDebounceFn<A extends unknown[], R>(fn: (...args: A) => R, options?: DebounceOptions): {
    run: import("lodash").DebouncedFunc<(...args: A) => R>;
    cancel: () => void;
    flush: () => R | undefined;
};
