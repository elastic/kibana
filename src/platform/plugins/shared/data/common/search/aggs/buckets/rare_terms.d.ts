import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsRareTerms extends BaseAggParams {
    field: string;
    max_doc_count?: number;
}
export declare const getRareTermsBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
