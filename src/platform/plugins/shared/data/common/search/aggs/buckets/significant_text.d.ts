import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsSignificantText extends BaseAggParams {
    field: string;
    size?: number;
    min_doc_count?: number;
    filter_duplicate_text?: boolean;
    exclude?: string;
    include?: string;
}
export declare const getSignificantTextBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
