import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsBucketMaxSerialized extends BaseAggParams {
    customMetric?: AggConfigSerialized;
    customBucket?: AggConfigSerialized;
}
export interface AggParamsBucketMax extends BaseAggParams {
    customMetric?: IAggConfig;
    customBucket?: IAggConfig;
}
export declare const getBucketMaxMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
