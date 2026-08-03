import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export { termsAggFilter } from './_terms_order_helper';
export type AggParamsTimeSeries = BaseAggParams;
export declare const getTimeSeriesBucketAgg: () => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
