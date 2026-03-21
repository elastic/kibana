import type { IpPrefix } from '../../expressions';
import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsIpPrefix extends BaseAggParams {
    field: string;
    ipPrefix?: IpPrefix;
}
export declare const getIpPrefixBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
