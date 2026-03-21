import type { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
export declare const parentPipelineType: string;
export declare const parentPipelineAggHelper: {
    subtype: string;
    params(): Array<MetricAggParam<IMetricAggConfig>>;
    getSerializedFormat(agg: IMetricAggConfig): any;
};
