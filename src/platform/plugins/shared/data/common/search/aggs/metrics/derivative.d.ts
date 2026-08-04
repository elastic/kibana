import { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface CommonAggParamsDerivative extends BaseAggParams {
    buckets_path?: string;
    metricAgg?: string;
}
export interface AggParamsDerivativeSerialized extends CommonAggParamsDerivative {
    customMetric?: AggConfigSerialized;
}
export interface AggParamsDerivative extends CommonAggParamsDerivative {
    customMetric?: IAggConfig;
}
export declare const getDerivativeMetricAgg: () => MetricAggType<import("./metric_agg_type").IMetricAggConfig>;
