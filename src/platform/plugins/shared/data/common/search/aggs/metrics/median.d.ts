import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsMedian extends BaseAggParams {
    field: string;
}
export declare const getMedianMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
