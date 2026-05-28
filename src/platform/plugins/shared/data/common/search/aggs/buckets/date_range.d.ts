import type { DateRange } from '../../expressions';
import type { IBucketAggConfig } from './bucket_agg_type';
import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
import type { AggTypesDependencies } from '../agg_types';
export interface AggParamsDateRange extends BaseAggParams {
    field?: string;
    ranges?: DateRange[];
    time_zone?: string;
}
export declare const getDateRangeBucketAgg: ({ aggExecutionContext, getConfig }: AggTypesDependencies) => BucketAggType<IBucketAggConfig>;
