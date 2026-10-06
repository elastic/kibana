import type { BaseAggParams } from '../types';
import { MetricAggType } from './metric_agg_type';
export interface AggParamsCount extends BaseAggParams {
    emptyAsNull?: boolean;
}
export declare const getCountMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
