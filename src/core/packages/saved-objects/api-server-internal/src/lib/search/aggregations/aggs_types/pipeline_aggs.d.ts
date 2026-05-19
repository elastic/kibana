import type { ObjectType } from '@kbn/config-schema';
/**
 * Schemas for the Bucket aggregations.
 *
 * Currently supported:
 * - max_bucket
 *
 * Not implemented:
 * - avg_bucket
 * - bucket_script
 * - bucket_count_ks_test
 * - bucket_correlation
 * - bucket_selector
 * - bucket_sort
 * - cumulative_cardinality
 * - cumulative_sum
 * - derivative
 * - extended_stats_bucket
 * - inference
 * - min_bucket
 * - moving_fn
 * - moving_percentiles
 * - normalize
 * - percentiles_bucket
 * - serial_diff
 * - stats_bucket
 * - sum_bucket
 */
export declare const pipelineAggsSchemas: Record<string, ObjectType>;
