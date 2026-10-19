/**
 * Returns a new object containing only the given dotted-path fields from `source`,
 * preserving the original nested structure and value types (numbers, booleans, and
 * arrays are kept as-is, not stringified).
 *
 * - Paths that are absent, or that traverse through a non-object/non-array, are skipped.
 * - Numeric segments index into arrays (`users.9.surname`); the picked structure keeps
 *   the array shape and the element's original index (intervening positions stay empty).
 * - Paths containing `__proto__`, `prototype`, or `constructor` are skipped to
 *   avoid prototype pollution.
 * - The `source` is never mutated; leaf values are deep-cloned.
 * - A non-object `source` is returned unchanged.
 *
 * @example
 * pickObjectFields({ a: { b: 1, c: 2 }, d: 3 }, ['a.b', 'd']) // => { a: { b: 1 }, d: 3 }
 * @example
 * pickObjectFields({ users: [{ name: 'a', age: 1 }] }, ['users.0.name']) // => { users: [{ name: 'a' }] }
 */
export declare const pickObjectFields: (source: unknown, paths: readonly string[]) => unknown;
