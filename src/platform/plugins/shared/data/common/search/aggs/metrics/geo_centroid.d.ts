import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsGeoCentroid extends BaseAggParams {
    field: string;
}
export declare const getGeoCentroidMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
