import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
export interface AggParamsPercentileRanks extends BaseAggParams {
    field: string;
    values?: number[];
}
export type IPercentileRanksAggConfig = IResponseAggConfig;
export interface PercentileRanksMetricAggDependencies {
    getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}
export declare const getPercentileRanksMetricAgg: ({ getFieldFormatsStart, }: PercentileRanksMetricAggDependencies) => MetricAggType<IResponseAggConfig>;
