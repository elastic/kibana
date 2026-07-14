import type { estypes } from '@elastic/elasticsearch';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, FilterMeta } from './types';
export interface MatchAllFilterMeta extends FilterMeta, SerializableRecord {
    field: string;
    formattedValue: string;
}
export type MatchAllFilter = Filter & {
    meta: MatchAllFilterMeta;
    query: {
        match_all: estypes.QueryDslMatchAllQuery;
    };
};
/**
 * @param filter
 * @returns `true` if a filter is an `MatchAllFilter`
 *
 * @public
 */
export declare const isMatchAllFilter: (filter: Filter) => filter is MatchAllFilter;
