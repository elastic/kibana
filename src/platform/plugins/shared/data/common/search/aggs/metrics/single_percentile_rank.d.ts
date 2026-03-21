import { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import type { BaseAggParams } from '../types';
export interface AggParamsSinglePercentileRank extends BaseAggParams {
    field: string;
    value: number;
}
export declare const getSinglePercentileRankMetricAgg: () => MetricAggType<IResponseAggConfig>;
