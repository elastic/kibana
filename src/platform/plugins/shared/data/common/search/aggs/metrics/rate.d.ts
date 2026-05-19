import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsRate extends BaseAggParams {
    unit: string;
    field?: string;
}
export declare const getRateMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
