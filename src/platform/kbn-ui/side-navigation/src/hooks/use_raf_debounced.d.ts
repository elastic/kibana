/**
 * Hook that returns a debounced callback using `requestAnimationFrame`.
 *
 * @param fn - the callback function to debounce.
 */
export declare function useRafDebouncedCallback(fn: () => void): readonly [() => void, () => void];
