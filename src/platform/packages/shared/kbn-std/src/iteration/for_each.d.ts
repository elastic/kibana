import type { IterableInput, AsyncMapFn } from './types';
/**
 * Creates a promise which resolves with `undefined` after calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * @param iterable Items to iterate
 * @param fn Function to call for each item
 */
export declare function asyncForEach<T>(iterable: IterableInput<T>, fn: AsyncMapFn<T, any>): Promise<void>;
/**
 * Creates a promise which resolves with `undefined` after calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or Observable. If `fn`
 * returns observables then they will properly abort if an error occurs.
 *
 * The number of concurrent executions of `fn` is limited by `limit`.
 *
 * @param iterable Items to iterate
 * @param limit Maximum number of operations to run in parallel
 * @param fn Function to call for each item
 */
export declare function asyncForEachWithLimit<T>(iterable: IterableInput<T>, limit: number, fn: AsyncMapFn<T, any>): Promise<void>;
