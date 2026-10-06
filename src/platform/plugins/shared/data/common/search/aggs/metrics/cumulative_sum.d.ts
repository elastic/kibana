import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface CommonAggParamsCumulativeSum extends BaseAggParams {
    buckets_path?: string;
    metricAgg?: string;
}
export interface AggParamsCumulativeSumSerialized extends CommonAggParamsCumulativeSum {
    customMetric?: AggConfigSerialized;
}
export interface AggParamsCumulativeSum extends CommonAggParamsCumulativeSum {
    customMetric?: IAggConfig;
}
export declare const getCumulativeSumMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
