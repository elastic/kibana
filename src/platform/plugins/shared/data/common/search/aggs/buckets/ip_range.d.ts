import { BucketAggType } from './bucket_agg_type';
import type { RangeIpRangeAggKey, CidrMaskIpRangeAggKey } from './lib/ip_range';
import type { BaseAggParams } from '../types';
export declare enum IP_RANGE_TYPES {
    FROM_TO = "fromTo",
    MASK = "mask"
}
export interface AggParamsIpRange extends BaseAggParams {
    field: string;
    ipRangeType?: IP_RANGE_TYPES;
    ranges?: Partial<{
        [IP_RANGE_TYPES.FROM_TO]: RangeIpRangeAggKey[];
        [IP_RANGE_TYPES.MASK]: CidrMaskIpRangeAggKey[];
    }>;
}
export declare const getIpRangeBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
