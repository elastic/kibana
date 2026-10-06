import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsSignificantTerms extends BaseAggParams {
    field: string;
    size?: number;
    shardSize?: number;
    exclude?: string | string[];
    include?: string | string[];
}
export declare const getSignificantTermsBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
