import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsFilteredMetricSerialized extends BaseAggParams {
    customMetric?: AggConfigSerialized;
    customBucket?: AggConfigSerialized;
}
export interface AggParamsFilteredMetric extends BaseAggParams {
    customMetric?: IAggConfig;
    customBucket?: IAggConfig;
}
export interface FiltersMetricAggDependencies {
    getConfig: <T = unknown>(key: string) => T;
}
export declare const getFilteredMetricAgg: ({ getConfig }: FiltersMetricAggDependencies) => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
