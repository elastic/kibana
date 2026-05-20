import { BucketAggType } from './bucket_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export { termsAggFilter } from './_terms_order_helper';
export interface CommonAggParamsTerms extends BaseAggParams {
    field: string;
    orderBy: string;
    size?: number;
    shardSize?: number;
    missingBucket?: boolean;
    missingBucketLabel?: string;
    otherBucket?: boolean;
    otherBucketLabel?: string;
    exclude?: string[] | string | number[];
    include?: string[] | string | number[];
    includeIsRegex?: boolean;
    excludeIsRegex?: boolean;
}
export interface AggParamsTermsSerialized extends CommonAggParamsTerms {
    orderAgg?: AggConfigSerialized;
    order?: 'asc' | 'desc';
}
export interface AggParamsTerms extends CommonAggParamsTerms {
    orderAgg?: IAggConfig;
    order?: {
        value: 'asc' | 'desc';
        text: string;
    };
}
export declare const getTermsBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
