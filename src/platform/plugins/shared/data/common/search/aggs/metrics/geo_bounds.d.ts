import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsGeoBounds extends BaseAggParams {
    field: string;
}
export declare const getGeoBoundsMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
