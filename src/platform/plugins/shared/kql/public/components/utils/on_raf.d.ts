/**
 * Debounce a function till next animation frame
 * @param fn
 */
export declare function onRaf(fn: Function): (...args: unknown[]) => void;
