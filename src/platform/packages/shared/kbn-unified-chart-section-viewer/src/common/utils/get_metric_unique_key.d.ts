import type { ParsedMetricItem } from '../../types';
/**
 * Stable, opaque identifier for a metric item, used to restore selection
 * across grid reorders, pagination, re-fetch, and tab duplication.
 *
 * Safe collision-wise: the key is compared by equality, never split. ES
 * forbids `:` in data stream names, so the first `::` is always the delimiter
 * and the encoding stays injective even if `metricName` contains `::`.
 */
export declare const getMetricUniqueKey: (metricItem: ParsedMetricItem) => string;
