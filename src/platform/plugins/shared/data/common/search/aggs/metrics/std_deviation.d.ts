import { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import type { BaseAggParams } from '../types';
export interface AggParamsStdDeviation extends BaseAggParams {
    field: string;
    showBounds?: boolean;
}
interface ValProp {
    valProp: string[];
    title: string;
}
export interface IStdDevAggConfig extends IResponseAggConfig {
    keyedDetails: (customLabel: string, fieldDisplayName?: string) => Record<string, ValProp>;
    valProp: () => string[];
}
export declare const getStdDeviationMetricAgg: () => MetricAggType<IStdDevAggConfig>;
export {};
