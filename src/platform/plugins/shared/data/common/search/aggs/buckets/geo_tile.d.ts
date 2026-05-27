import { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export interface AggParamsGeoTile extends BaseAggParams {
    field: string;
    useGeocentroid?: boolean;
    precision?: number;
}
export declare const getGeoTitleBucketAgg: () => BucketAggType<any>;
