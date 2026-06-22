import type { estypes } from '@elastic/elasticsearch';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, FilterMeta, FilterMetaParams } from './types';
import type { DataViewFieldBase, DataViewBaseNoFields } from '../../es_query';
/**
 * An interface for all possible range filter params
 * It is similar, but not identical to estypes.QueryDslRangeQuery
 * @public
 */
export interface RangeFilterParams extends SerializableRecord {
    from?: number | string;
    to?: number | string;
    gt?: number | string;
    lt?: number | string;
    gte?: number | string;
    lte?: number | string;
    format?: string;
}
export declare const hasRangeKeys: (params: RangeFilterParams) => boolean;
export type RangeFilterMeta = FilterMeta & {
    params?: RangeFilterParams;
    field?: string;
    formattedValue?: string;
    type: 'range';
};
export type ScriptedRangeFilter = Filter & {
    meta: RangeFilterMeta;
    query: {
        script: {
            script: estypes.Script;
        };
    };
};
export type MatchAllRangeFilter = Filter & {
    meta: RangeFilterMeta;
    query: {
        match_all: NonNullable<estypes.QueryDslQueryContainer>['match_all'];
    };
};
/**
 * @public
 */
export type RangeFilter = Filter & {
    meta: RangeFilterMeta;
    query: {
        range: {
            [key: string]: RangeFilterParams;
        };
    };
};
/**
 * @param filter
 * @returns `true` if a filter is an `RangeFilter`
 *
 * @public
 */
export declare function isRangeFilter(filter?: Filter): filter is RangeFilter;
export declare function isRangeFilterParams(params: FilterMetaParams | undefined): params is RangeFilterParams;
/**
 *
 * @param filter
 * @returns `true` if a filter is a scripted `RangeFilter`
 *
 * @public
 */
export declare const isScriptedRangeFilter: (filter: Filter) => filter is ScriptedRangeFilter;
/**
 * @internal
 */
export declare const getRangeFilterField: (filter: RangeFilter | ScriptedRangeFilter) => any;
/**
 * Creates a filter where the value for the given field is in the given range
 * params should be an object containing `lt`, `lte`, `gt`, and/or `gte`
 *
 * @param field
 * @param params
 * @param dataView
 * @param formattedValue
 * @returns
 *
 * @public
 */
export declare const buildRangeFilter: (field: DataViewFieldBase, params: RangeFilterParams, indexPattern?: DataViewBaseNoFields, formattedValue?: string) => RangeFilter | ScriptedRangeFilter | MatchAllRangeFilter;
export declare const buildSimpleNumberRangeFilter: (fieldName: string, fieldType: "number" | "date", params: RangeFilterParams, value: string, dataViewId: string) => ScriptedRangeFilter | RangeFilter | MatchAllRangeFilter;
/**
 * @internal
 */
export declare const getRangeScript: (field: DataViewFieldBase, params: RangeFilterParams) => {
    script: {
        source: string;
        params: Record<string, any>;
        lang: string;
    };
};
