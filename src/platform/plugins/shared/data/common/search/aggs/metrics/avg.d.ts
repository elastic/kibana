import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsAvg extends BaseAggParams {
    field: string;
}
export declare const getAvgMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
