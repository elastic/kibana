/**
 * A flattened object containing lodash-style dot-separated keys, which
 * indicate the path to where each corresponding value should live in a
 * nested object.
 *
 * @remarks
 * Arrays are treated as primitives here: array entries should not be broken
 * down into separate keys.
 *
 * @example
 * ```ts
 * const context: GlobalContext = {
 *   a: true,
 *   'b.c': [1, 2, 3],
 *   'd.e.f': 'g',
 * };
 * ```
 *
 * @internal
 */
export type GlobalContext = Record<string, unknown>;
