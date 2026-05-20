/**
 * A simple memoize function, that only stores the last returned value
 * and uses the identity of all passed parameters as a cache key.
 */
declare function memoizeLast<T extends (...args: any[]) => any>(func: T): T;
export { memoizeLast };
