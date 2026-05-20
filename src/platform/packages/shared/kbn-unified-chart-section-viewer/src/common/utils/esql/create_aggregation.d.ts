import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';
/**
 * Creates the metric aggregation part of an ES|QL query.
 * It returns:
 * - For legacy histogram (field type + instrument both histogram): `PERCENTILE(TO_TDIGEST(...), 95)`
 * - For `histogram` instrument: `PERCENTILE(..., 95)` if type is `exponential_histogram` or `tdigest`
 * - `SUM(RATE(...))` for counter instruments
 * - `AVG(...)` for other metric types
 *
 * When multiple field types are present (from different backing indices with conflicting mappings),
 * the aggregation will wrap the field in an appropriate casting function (e.g., TO_DOUBLE) to resolve the ambiguity.
 *
 * When `metricName` is provided the column is resolved and properly escaped.
 * Otherwise a `??placeholderName` parameter placeholder is emitted.
 *
 * @param types - The ES field types array (for conflicting mappings across backing indices).
 * @param instrument - The metric instrument type (e.g., 'counter', 'histogram', 'gauge').
 * @param metricName - The actual name of the metric field to aggregate.
 * @param placeholderName - The name of the placeholder to use in the template.
 * @param customFunction - Optional custom aggregation function to use for default case.
 * @returns The ES|QL aggregation string.
 */
export declare function createMetricAggregation({ types, instrument, metricName, placeholderName, customFunction, }: {
    types: ES_FIELD_TYPES[];
    instrument: MappingTimeSeriesMetricType;
    metricName?: string;
    placeholderName?: string;
    customFunction?: string;
}): string;
/**
 * Creates the time bucketing part of an ES|QL query using `TBUCKET`,
 * which automatically resolves the timestamp field via the Kibana timestamp filter.
 *
 * @param targetBuckets - The desired number of buckets for the time series.
 * @returns The ES|QL TBUCKET function string.
 */
export declare function createTimeBucketAggregation({ targetBuckets }: {
    targetBuckets?: number;
}): string;
