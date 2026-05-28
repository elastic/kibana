import type { AggTypeConfig } from '../agg_type';
import { AggType } from '../agg_type';
import type { AggParamType } from '../param_types/agg';
import type { AggConfig } from '../agg_config';
import type { FieldTypes } from '../param_types';
export interface IMetricAggConfig extends AggConfig {
    type: InstanceType<typeof MetricAggType>;
}
export interface MetricAggParam<TMetricAggConfig extends AggConfig> extends AggParamType<TMetricAggConfig> {
    filterFieldTypes?: FieldTypes;
    onlyAggregatable?: boolean;
    scriptable?: boolean;
}
interface MetricAggTypeConfig<TMetricAggConfig extends AggConfig> extends AggTypeConfig<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
    isScalable?: () => boolean;
    subtype?: string;
    enableEmptyAsNull?: boolean;
}
export type IMetricAggType = MetricAggType;
export declare class MetricAggType<TMetricAggConfig extends AggConfig = IMetricAggConfig> extends AggType<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
    subtype: string;
    isScalable: () => boolean;
    type: string;
    getKey: () => void;
    constructor(config: MetricAggTypeConfig<TMetricAggConfig>);
}
export declare function isMetricAggType(aggConfig: any): aggConfig is MetricAggType;
export {};
