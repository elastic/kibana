import type { IterableInput, AsyncMapFn } from './types';
/**
 * Creates an observable whose values are the result of calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or an Observable. If
 * `fn` returns observables then they will properly abort if an error occurs.
 *
 * Results are emitted as soon as they are available so their order is very
 * likely to not match their order in the input `array`.
 *
 * @param iterable Items to iterate
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export declare function map$<T1, T2>(iterable: IterableInput<T1>, fn: AsyncMapFn<T1, T2>): import("rxjs").Observable<T2>;
/**
 * Creates an observable whose values are the result of calling `fn` for each
 * item in `iterable`. `fn` can return either a Promise or an Observable. If
 * `fn` returns observables then they will properly abort if an error occurs.
 *
 * The number of concurrent executions of `fn` is limited by `limit`.
 *
 * Results are emitted as soon as they are available so their order is very
 * likely to not match their order in the input `array`.
 *
 * @param iterable Items to iterate
 * @param limit Maximum number of operations to run in parallel
 * @param fn Function to call for each item. Result is added/concatenated into the result array in place of the input value
 */
export declare function mapWithLimit$<T1, T2>(iterable: IterableInput<T1>, limit: number, fn: AsyncMapFn<T1, T2>): import("rxjs").Observable<T2>;
