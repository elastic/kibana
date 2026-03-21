export declare const MAX_AGGREGATE_ITEMS = 100000;
interface Metric {
    name: string;
    operation: 'count' | 'sum' | 'avg' | 'min' | 'max';
    field?: string;
}
interface BucketRange {
    from?: number;
    to?: number;
    label?: string;
}
interface BucketConfig {
    field: string;
    ranges: BucketRange[];
}
/**
 * Safely traverses nested fields via dot notation.
 * e.g. getFieldValue({ user: { name: 'Bob' } }, 'user.name') => 'Bob'
 */
export declare function getFieldValue(item: unknown, field: string): unknown;
export declare function computeMetric(items: unknown[], metric: Metric): number | null;
/**
 * Groups items into a Map keyed by a composite of the requested field values.
 * Each key part is JSON.stringify'd and joined with a null-char delimiter
 * to avoid collision with user data (e.g. values containing "::").
 */
export declare function groupItemsByKeys(items: unknown[], keys: string[], abortSignal?: AbortSignal): Map<string, unknown[]>;
/**
 * Assigns an item to a bucket range based on a numeric field.
 * Ranges are half-open intervals: [from, to)
 */
export declare function assignBucket(item: unknown, config: BucketConfig): string | null;
/**
 * Inverse of the composite key built by groupItemsByKeys —
 * splits the key and JSON.parse's each part back to its original value.
 */
export declare function parseGroupKeyValues(compositeKey: string, keys: string[]): Record<string, unknown>;
export {};
