/**
 * Uses a debouncer collector behind a debouncing factory to work on a set of functions
 *
 * @template F - function type
 * @param {F} fn - function to debounce
 * @param {number} waitInMs
 * @returns {(key: string) => Function}
 */
export declare const debounceByKey: <F extends (...args: any) => unknown>(fn: F, waitInMs: number) => ((key: string) => Function);
