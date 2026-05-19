export interface ThrottleOptions {
    wait?: number;
    leading?: boolean;
    trailing?: boolean;
}
/**
 * Custom hook that returns a React safe  throttled version of the provided function.
 *
 * @param {Function} fn - The function to throttle.
 * @param {Object} [options] - Optional configuration options for throttle.
 * @param {number} [options.wait=1000] - The number of milliseconds to delay.
 * @param {boolean} [options.leading=true] - Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=false] - Specify invoking on the trailing edge of the timeout.
 *
 * @returns {Object} - An object containing the throttled function (`run`), and methods to cancel (`cancel`) or flush (`flush`) the throttle.
 *
 * @throws {Error} - Throws an error if the provided `fn` is not a function.
 *
 * @caveat The throttle does not cancel if `options` or `wait` are changed between calls.
 */
export declare function useThrottleFn<A extends unknown[], R>(fn: (...args: A) => R, options?: ThrottleOptions): {
    run: import("lodash").DebouncedFuncLeading<(...args: A) => R>;
    cancel: () => void;
    flush: () => R;
};
