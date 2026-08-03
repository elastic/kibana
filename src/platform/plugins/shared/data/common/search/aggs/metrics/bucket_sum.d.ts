import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsBucketSumSerialized extends BaseAggParams {
    customMetric?: AggConfigSerialized;
    customBucket?: AggConfigSerialized;
}
export interface AggParamsBucketSum extends BaseAggParams {
    customMetric?: IAggConfig;
    customBucket?: IAggConfig;
}
export declare const getBucketSumMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
