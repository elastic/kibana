import type { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
export declare const siblingPipelineType: string;
export declare const siblingPipelineAggHelper: {
    subtype: string;
    params(bucketFilter?: string[]): Array<MetricAggParam<IMetricAggConfig>>;
    getSerializedFormat(agg: IMetricAggConfig): any;
};
