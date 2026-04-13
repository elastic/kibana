import type { IterableInput, AsyncMapFn } from './types';
/**
 * Creates a promise whose values is the array of results produced by calling `fn` for
 * each item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The result array follows the order of the input iterable, even though the calls
 * to `fn` may not. (so avoid side effects)
 *
 * @param iterable Items to iterate
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export declare function asyncMap<T1, T2>(iterable: IterableInput<T1>, fn: AsyncMapFn<T1, T2>): Promise<T2[]>;
/**
 * Creates a promise whose values is the array of results produced by calling `fn` for
 * each item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The number of concurrent executions of `fn` is limited by `limit`.
 *
 * The result array follows the order of the input iterable, even though the calls
 * to `fn` may not. (so avoid side effects)
 *
 * @param iterable Items to iterate
 * @param limit Maximum number of operations to run in parallel
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export declare function asyncMapWithLimit<T1, T2>(iterable: IterableInput<T1>, limit: number, fn: AsyncMapFn<T1, T2>): Promise<T2[]>;
