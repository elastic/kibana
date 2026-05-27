import type { IBucketAggConfig } from '../bucket_agg_type';
export declare const createFilterFilters: (aggConfig: IBucketAggConfig, key: string) => {
    query: (Record<string, any> & {
        query_string?: {
            query: string;
            fields?: string[];
        };
    }) | undefined;
    meta: {
        alias: string | null;
        disabled?: boolean;
        negate?: boolean;
        controlledBy?: string;
        group?: string;
        index: string;
        isMultiIndex?: boolean;
        type?: string;
        key?: string;
        params?: import("@kbn/es-query/src/filters/build_filters").FilterMetaParams;
        value?: string | import("@kbn/es-query").RangeFilterParams | import("@kbn/es-query/src/filters/build_filters").PhraseFilterValue[];
    };
} | undefined;
