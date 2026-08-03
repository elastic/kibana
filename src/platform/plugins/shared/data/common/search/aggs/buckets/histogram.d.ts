import type { ExtendedBounds } from '../../expressions';
import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import type { IBucketAggConfig } from './bucket_agg_type';
import { BucketAggType } from './bucket_agg_type';
export interface AutoBounds {
    min: number;
    max: number;
}
export interface HistogramBucketAggDependencies {
    getConfig: <T = any>(key: string) => T;
    getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}
export interface IBucketHistogramAggConfig extends IBucketAggConfig {
    setAutoBounds: (bounds: AutoBounds) => void;
    getAutoBounds: () => AutoBounds;
}
export interface AggParamsHistogram extends BaseAggParams {
    field: string;
    interval: number | string;
    used_interval?: number | string;
    maxBars?: number;
    intervalBase?: number;
    min_doc_count?: boolean;
    has_extended_bounds?: boolean;
    extended_bounds?: ExtendedBounds;
    autoExtendBounds?: boolean;
}
export declare const getHistogramBucketAgg: ({ getConfig, getFieldFormatsStart, }: HistogramBucketAggDependencies) => BucketAggType<IBucketHistogramAggConfig>;
