/**
 * Mark a value as possibly undefined. Useful for array and object access
 * which won't account for the possibility where the item at the specified
 * index is undefined. E.g.:
 *
 * const val = maybe(obj[key]);
 */
export declare function maybe<T>(value: T): T | undefined;
