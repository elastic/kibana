import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface CommonAggParamsMovingAvg extends BaseAggParams {
    buckets_path?: string;
    window?: number;
    script?: string;
    metricAgg?: string;
}
export interface AggParamsMovingAvgSerialized extends CommonAggParamsMovingAvg {
    customMetric?: AggConfigSerialized;
}
export interface AggParamsMovingAvg extends CommonAggParamsMovingAvg {
    customMetric?: IAggConfig;
}
export declare const getMovingAvgMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
