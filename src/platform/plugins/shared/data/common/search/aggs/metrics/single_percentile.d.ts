import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsSinglePercentile extends BaseAggParams {
    field: string;
    percentile: number;
}
export declare const getSinglePercentileMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
