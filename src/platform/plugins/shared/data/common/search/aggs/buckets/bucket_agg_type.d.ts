import type moment from 'moment';
import type { IAggConfig } from '../agg_config';
import type { FilterFieldFn, GenericBucket, IAggConfigs } from '../../..';
import type { AggTypeConfig } from '../agg_type';
import { AggType } from '../agg_type';
import type { AggParamType } from '../param_types/agg';
import type { FieldTypes } from '../param_types/field';
export interface IBucketAggConfig extends IAggConfig {
    type: InstanceType<typeof BucketAggType>;
}
export interface BucketAggParam<TBucketAggConfig extends IAggConfig> extends AggParamType<TBucketAggConfig> {
    scriptable?: boolean;
    filterFieldTypes?: FieldTypes;
    onlyAggregatable?: boolean;
    /**
     * Filter available fields by passing filter fn on a {@link DataViewField}
     * If used, takes precedence over filterFieldTypes and other filter params
     */
    filterField?: FilterFieldFn;
}
interface BucketAggTypeConfig<TBucketAggConfig extends IAggConfig> extends AggTypeConfig<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
    getKey?: (bucket: any, key: any, agg: IAggConfig) => any;
    getShiftedKey?: (agg: TBucketAggConfig, key: string | number, timeShift: moment.Duration) => string | number;
    orderBuckets?(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number;
    splitForTimeShift?(agg: TBucketAggConfig, aggs: IAggConfigs): boolean;
    getTimeShiftInterval?(agg: TBucketAggConfig): undefined | moment.Duration;
}
export declare class BucketAggType<TBucketAggConfig extends IAggConfig = IBucketAggConfig> extends AggType<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
    getKey: (bucket: any, key: any, agg: TBucketAggConfig) => any;
    type: string;
    getShiftedKey(agg: TBucketAggConfig, key: string | number, timeShift: moment.Duration): string | number;
    getTimeShiftInterval(agg: TBucketAggConfig): undefined | moment.Duration;
    orderBuckets(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number;
    constructor(config: BucketAggTypeConfig<TBucketAggConfig>);
}
export declare function isBucketAggType(aggConfig: any): aggConfig is BucketAggType;
export {};
