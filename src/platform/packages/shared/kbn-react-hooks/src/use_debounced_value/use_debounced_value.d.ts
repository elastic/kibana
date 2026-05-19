export interface UseDebouncedValueOptions<T> {
    /**
     * Custom comparison function. Return `true` when the values should be
     * considered equal (skip the debounce). Defaults to strict equality (`===`).
     */
    compare?: (a: T, b: T) => boolean;
}
/**
 * Returns a debounced version of the provided value. The returned value only
 * updates after the specified wait period has elapsed since the last change.
 *
 * @param value - The value to debounce.
 * @param wait - Milliseconds to delay before updating. Defaults to 300.
 * @param options - Optional configuration.
 * @param options.compare - Custom equality check; return `true` to treat values as equal.
 *
 * @returns The debounced value.
 */
export declare const useDebouncedValue: <T>(value: T, wait?: number, options?: UseDebouncedValueOptions<T>) => T;
