import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsBucketAvgSerialized extends BaseAggParams {
    customMetric?: AggConfigSerialized;
    customBucket?: AggConfigSerialized;
}
export interface AggParamsBucketAvg extends BaseAggParams {
    customMetric?: IAggConfig;
    customBucket?: IAggConfig;
}
export declare const getBucketAvgMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
