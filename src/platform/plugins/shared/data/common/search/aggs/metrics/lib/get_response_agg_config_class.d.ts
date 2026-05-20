import type { IMetricAggConfig } from '../metric_agg_type';
/**
 * Get the ResponseAggConfig class for an aggConfig,
 * which might be cached on the aggConfig or created.
 *
 * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
 * @param  {object} props - properties that the VAC should have
 * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
 */
export declare const getResponseAggConfigClass: (agg: any, props: Partial<IMetricAggConfig>) => any;
export interface IResponseAggConfig extends IMetricAggConfig {
    key: string | number;
    parentId: IMetricAggConfig['id'];
}
export declare function getResponseAggId(parentId: string, key: string): string;
export declare const create: (parentAgg: IMetricAggConfig, props: Partial<IMetricAggConfig>) => {
    (this: IResponseAggConfig, key: string): void;
    prototype: any;
};
