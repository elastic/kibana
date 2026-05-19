import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export declare const SAMPLER_AGG_NAME = "sampler";
export interface AggParamsSampler extends BaseAggParams {
    /**
     * Limits how many top-scoring documents are collected in the sample processed on each shard.
     */
    shard_size?: number;
}
/**
 * A filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 */
export declare const getSamplerBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
