import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsMin extends BaseAggParams {
    field: string;
}
export declare const getMinMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
