import type { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchSource } from '../../../../public';
import type { IAggConfigs } from '../agg_configs';
import type { IAggConfig } from '../agg_config';
export declare class BaseParamType<TAggConfig extends IAggConfig = IAggConfig> {
    name: string;
    type: string;
    displayName: string;
    required: boolean;
    advanced: boolean;
    default: any;
    write: (aggConfig: TAggConfig, output: Record<string, any>, aggConfigs?: IAggConfigs, locals?: Record<string, any>) => void;
    serialize: (value: any, aggConfig?: TAggConfig) => any;
    deserialize: (value: any, aggConfig?: TAggConfig) => any;
    toExpressionAst?: (value: any) => ExpressionAstExpression[] | ExpressionAstExpression | undefined;
    options: any[];
    getValueType: (aggConfig: IAggConfig) => any;
    onChange?(agg: TAggConfig): void;
    shouldShow?(agg: TAggConfig): boolean;
    /**
     *  A function that will be called before an aggConfig is serialized and sent to ES.
     *  Allows aggConfig to retrieve values needed for serialization
     *  Example usage: an aggregation needs to know the min/max of a field to determine an appropriate interval
     *
     *  @param {AggConfig} aggConfig
     *  @param {Courier.SearchSource} searchSource
     *  @returns {Promise<undefined>|undefined}
     */
    modifyAggConfigOnSearchRequestStart: (aggConfig: TAggConfig, searchSource?: ISearchSource, options?: ISearchOptions) => void;
    constructor(config: Record<string, any>);
}
