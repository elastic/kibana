import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsMax extends BaseAggParams {
    field: string;
}
export declare const getMaxMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
