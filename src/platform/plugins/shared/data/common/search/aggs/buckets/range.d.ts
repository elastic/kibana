import type { NumericalRange } from '../../expressions';
import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import { BucketAggType } from './bucket_agg_type';
export interface RangeBucketAggDependencies {
    getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}
export interface AggParamsRange extends BaseAggParams {
    field: string;
    ranges?: NumericalRange[];
}
export declare const getRangeBucketAgg: ({ getFieldFormatsStart }: RangeBucketAggDependencies) => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
