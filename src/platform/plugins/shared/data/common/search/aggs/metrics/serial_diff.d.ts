import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface CommonAggParamsSerialDiff extends BaseAggParams {
    buckets_path?: string;
    metricAgg?: string;
}
export interface AggParamsSerialDiffSerialized extends CommonAggParamsSerialDiff {
    customMetric?: AggConfigSerialized;
}
export interface AggParamsSerialDiff extends CommonAggParamsSerialDiff {
    customMetric?: IAggConfig;
}
export declare const getSerialDiffMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
