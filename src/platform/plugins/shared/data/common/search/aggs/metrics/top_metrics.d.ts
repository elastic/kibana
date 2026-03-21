import { MetricAggType } from './metric_agg_type';
import type { DataViewField } from '../../..';
import type { BaseAggParams } from '../types';
export interface BaseAggParamsTopMetrics extends BaseAggParams {
    field: string;
    size?: number;
}
export interface AggParamsTopMetricsSerialized extends BaseAggParamsTopMetrics {
    sortOrder?: 'desc' | 'asc';
    sortField?: string;
}
export interface AggParamsTopMetrics extends BaseAggParamsTopMetrics {
    sortOrder?: {
        value: 'desc' | 'asc';
        text: string;
    };
    sortField?: DataViewField;
}
export declare const getTopMetricsMetricAgg: () => MetricAggType<any>;
