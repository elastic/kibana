import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsSum extends BaseAggParams {
    field: string;
    emptyAsNull?: boolean;
}
export declare const getSumMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
