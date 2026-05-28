import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsBucketMinSerialized extends BaseAggParams {
    customMetric?: AggConfigSerialized;
    customBucket?: AggConfigSerialized;
}
export interface AggParamsBucketMin extends BaseAggParams {
    customMetric?: IAggConfig;
    customBucket?: IAggConfig;
}
export declare const getBucketMinMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
