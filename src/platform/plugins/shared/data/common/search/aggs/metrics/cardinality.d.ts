import type { IMetricAggConfig } from './metric_agg_type';
import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsCardinality extends BaseAggParams {
    field: string;
    emptyAsNull?: boolean;
}
export declare const getCardinalityMetricAgg: () => MetricAggType<IMetricAggConfig>;
