import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export declare const SHARD_DELAY_AGG_NAME = "shard_delay";
export interface AggParamsShardDelay extends BaseAggParams {
    delay?: string;
}
export declare const getShardDelayBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
