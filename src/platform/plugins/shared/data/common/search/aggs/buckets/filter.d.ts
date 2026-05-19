import type { GeoBoundingBox, QueryFilter } from '../../expressions';
import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
import type { CalculateBoundsFn } from '.';
export interface AggParamsFilter extends BaseAggParams {
    geo_bounding_box?: GeoBoundingBox;
    filter?: QueryFilter;
    timeWindow?: string;
}
export declare const getFilterBucketAgg: ({ getConfig, calculateBounds, }: {
    getConfig: <T = any>(key: string) => T;
    calculateBounds: CalculateBoundsFn;
}) => BucketAggType<import("./bucket_agg_type").IBucketAggConfig>;
