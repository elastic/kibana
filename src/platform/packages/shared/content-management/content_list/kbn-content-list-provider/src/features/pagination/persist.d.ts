/**
 * Read persisted page size from `localStorage`, falling back to the configured default.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param fallback - Default page size when no persisted value exists.
 * @returns The persisted page size, or `fallback` if none is found.
 */
export declare const getPersistedPageSize: (key: string, fallback: number) => number;
/**
 * Write page size to `localStorage`.
 *
 * @param key - Unique key for the content list (typically `queryKeyScope`).
 * @param size - Page size to persist.
 */
export declare const setPersistedPageSize: (key: string, size: number) => void;
