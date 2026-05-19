/**
 * Simple utilities for deterministic field ordering.
 */
/**
 * Sort object keys alphabetically for deterministic ordering.
 */
export declare function sortObjectByKeys<T extends Record<string, unknown>>(obj: T): T;
/**
 * Create sorted key-value entries from an object.
 */
export declare function createSortedEntries<T>(obj: Record<string, T>): Array<[string, T]>;
