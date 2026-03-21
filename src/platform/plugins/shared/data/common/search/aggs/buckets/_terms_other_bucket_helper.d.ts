import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '@kbn/es-query';
import type { IAggConfigs } from '../agg_configs';
import type { IAggConfig } from '../agg_config';
export declare const OTHER_NESTED_BUCKET_SEPARATOR = "\u2570\u2504\u25BA";
export declare const buildOtherBucketAgg: (aggConfigs: IAggConfigs, aggWithOtherBucket: IAggConfig, response: any) => false | (() => {
    sampling: {
        aggs: {
            'other-filter': {
                aggs: any;
                filters: any;
            };
        };
    };
    'other-filter'?: undefined;
} | {
    'other-filter': {
        aggs: any;
        filters: any;
    };
    sampling?: undefined;
});
export declare const mergeOtherBucketAggResponse: (aggsConfig: IAggConfigs, response: estypes.SearchResponse<any>, otherResponse: any, otherAgg: IAggConfig, requestAgg: Record<string, any>, otherFilterBuilder: (requestAgg: Record<string, any>, key: string, otherAgg: IAggConfig) => Filter) => estypes.SearchResponse<any>;
export declare const updateMissingBucket: (response: estypes.SearchResponse<any>, aggConfigs: IAggConfigs, agg: IAggConfig) => estypes.SearchResponse<any, Record<string, estypes.AggregationsAggregate>>;
export declare function constructSingleTermOtherFilter(requestAgg: Record<string, any>, key: string, otherAgg: IAggConfig): import("@kbn/es-query").PhrasesFilter;
export declare function constructMultiTermOtherFilter(requestAgg: Record<string, any>, key: string): Filter;
export declare const createOtherBucketPostFlightRequest: (otherFilterBuilder: (requestAgg: Record<string, any>, key: string, otherAgg: IAggConfig) => Filter) => (resp: estypes.SearchResponse<any>, aggConfigs: IAggConfigs, aggConfig: import("../agg_config").AggConfig, searchSource: import("../..").ISearchSource, inspectorRequestAdapter?: import("../../../../../inspector/common").RequestAdapter, abortSignal?: AbortSignal, searchSessionId?: string, disableWarningToasts?: boolean) => Promise<estypes.SearchResponse<any>>;
