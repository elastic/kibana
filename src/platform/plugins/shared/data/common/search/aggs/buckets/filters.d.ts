import type { QueryFilter } from '../../expressions';
import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface FiltersBucketAggDependencies {
    getConfig: <T = any>(key: string) => any;
}
export interface AggParamsFilters extends Omit<BaseAggParams, 'customLabel'> {
    filters?: QueryFilter[];
}
export declare const getFiltersBucketAgg: ({ getConfig }: FiltersBucketAggDependencies) => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
