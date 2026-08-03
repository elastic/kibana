import type { DataViewField } from '@kbn/data-views-plugin/common';
import { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface BaseAggParamsTopHit extends BaseAggParams {
    field: string;
    aggregate: 'min' | 'max' | 'sum' | 'average' | 'concat';
    size?: number;
}
export interface AggParamsTopHitSerialized extends BaseAggParamsTopHit {
    sortOrder?: 'desc' | 'asc';
    sortField?: string;
}
export interface AggParamsTopHit extends BaseAggParamsTopHit {
    sortOrder?: {
        value: 'desc' | 'asc';
        text: string;
    };
    sortField?: DataViewField;
}
export declare const getTopHitMetricAgg: () => MetricAggType<any>;
