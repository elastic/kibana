import { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import type { BaseAggParams } from '../types';
export interface AggParamsPercentiles extends BaseAggParams {
    field: string;
    percents?: number[];
}
export type IPercentileAggConfig = IResponseAggConfig;
export declare const getPercentilesMetricAgg: () => MetricAggType<IResponseAggConfig>;
