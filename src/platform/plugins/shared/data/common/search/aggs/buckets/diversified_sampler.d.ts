import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export declare const DIVERSIFIED_SAMPLER_AGG_NAME = "diversified_sampler";
export interface AggParamsDiversifiedSampler extends BaseAggParams {
    /**
     * Is used to provide values used for de-duplication
     */
    field: string;
    /**
     * Limits how many top-scoring documents are collected in the sample processed on each shard.
     */
    shard_size?: number;
    /**
     * Limits how many documents are permitted per choice of de-duplicating value
     */
    max_docs_per_value?: number;
}
/**
 * Like the sampler aggregation this is a filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 * The diversified_sampler aggregation adds the ability to limit the number of matches that share a common value.
 */
export declare const getDiversifiedSamplerBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
