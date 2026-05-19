import type { estypes } from '@elastic/elasticsearch';
import type { Filter } from '../filters';
import type { BoolQuery, DataViewBase } from './types';
/**
 * Options for building query for filters
 */
export interface EsQueryFiltersConfig {
    /**
     * by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
     */
    ignoreFilterIfFieldNotInIndex?: boolean;
    /**
     * the nested field type requires a special query syntax, which includes an optional ignore_unmapped parameter that indicates whether to ignore an unmapped path and not return any documents instead of an error.
     * The optional ignore_unmapped parameter defaults to false.
     * This `nestedIgnoreUnmapped` param allows creating queries with "ignore_unmapped": true
     */
    nestedIgnoreUnmapped?: boolean;
}
/**
 * @param filters
 * @param indexPattern
 * @param ignoreFilterIfFieldNotInIndex by default filters that use fields that can't be found in the specified index pattern are not applied. Set this to true if you want to apply them anyway.
 * @returns An EQL query
 *
 * @public
 */
export declare const buildQueryFromFilters: (inputFilters: Filter[] | undefined, inputDataViews: DataViewBase | DataViewBase[] | undefined, options?: EsQueryFiltersConfig) => BoolQuery;
export declare function filterToQueryDsl(filter: Filter, inputDataViews: DataViewBase | DataViewBase[] | undefined, options?: EsQueryFiltersConfig): estypes.QueryDslQueryContainer;
