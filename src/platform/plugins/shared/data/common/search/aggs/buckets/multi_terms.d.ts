import { BucketAggType } from './bucket_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
interface CommonAggParamsMultiTerms extends BaseAggParams {
    fields: string[];
    orderBy: string;
    order?: 'asc' | 'desc';
    size?: number;
    shardSize?: number;
    otherBucket?: boolean;
    otherBucketLabel?: string;
    separatorLabel?: string;
}
export interface AggParamsMultiTermsSerialized extends CommonAggParamsMultiTerms {
    orderAgg?: AggConfigSerialized;
}
export interface AggParamsMultiTerms extends CommonAggParamsMultiTerms {
    orderAgg?: IAggConfig;
}
export declare const getMultiTermsBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
export {};
