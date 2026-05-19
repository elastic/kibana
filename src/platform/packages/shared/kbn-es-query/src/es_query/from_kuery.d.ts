import type { Query } from '../filters';
import type { KueryQueryOptions } from '../kuery';
import type { BoolQuery, DataViewBase } from './types';
/** @internal */
export declare function buildQueryFromKuery(indexPattern: DataViewBase | undefined, queries?: Query[], { allowLeadingWildcards }?: {
    allowLeadingWildcards?: boolean;
}, { filtersInMustClause, dateFormatTZ, nestedIgnoreUnmapped, caseInsensitive, }?: KueryQueryOptions): BoolQuery;
