import type { ObservableLike, UnwrapObservable } from '@kbn/utility-types';
/**
 * This can convert a type into a known Expression string representation of
 * that type. For example, `TypeToString<Datatable>` will resolve to `'datatable'`.
 * This allows Expression Functions to continue to specify their type in a
 * simple string format.
 */
export type TypeToString<T> = KnownTypeToString<T> | UnmappedTypeStrings;
/**
 * Map the type of the generic to a string-based representation of the type.
 *
 * If the provided generic is its own type interface, we use the value of
 * the `type` key as a string literal type for it.
 */
export type KnownTypeToString<T> = T extends string ? 'string' : T extends boolean ? 'boolean' : T extends number ? 'number' : T extends null ? 'null' : T extends {
    type: string;
} ? T['type'] : never;
/**
 * If the type extends a Promise, we still need to return the string representation:
 *
 * `someArgument: Promise<boolean | string>` results in `types: ['boolean', 'string']`
 */
export type TypeString<T> = KnownTypeToString<T extends ObservableLike<unknown> ? UnwrapObservable<T> : Awaited<T>>;
/**
 * Types used in Expressions that don't map to a primitive cleanly:
 *
 * `date` is typed as a number or string, and represents a date
 */
export type UnmappedTypeStrings = 'date' | 'filter';
