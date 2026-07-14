import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, Query, AggregateQuery } from '../filters';
import type { BoolQuery, DataViewBase } from './types';
import type { KueryQueryOptions } from '../kuery';
import type { EsQueryFiltersConfig } from './from_filters';
type AnyQuery = Query | AggregateQuery;
/**
 * Configurations to be used while constructing an ES query.
 * @public
 */
export type EsQueryConfig = KueryQueryOptions & EsQueryFiltersConfig & {
    allowLeadingWildcards?: boolean;
    queryStringOptions?: SerializableRecord;
};
/**
 * @param indexPattern
 * @param queries - a query object or array of query objects. Each query has a language property and a query property.
 * @param filters - a filter object or array of filter objects
 * @param config - an objects with query:allowLeadingWildcards and query:queryString:options UI
 * settings in form of { allowLeadingWildcards, queryStringOptions }
 * config contains dateformat:tz
 * @throws throws an exception if it receives malformed input from queries (such as user queries)
 *
 * @public
 */
export declare function buildEsQuery(indexPattern: DataViewBase | DataViewBase[] | undefined, queries: AnyQuery | AnyQuery[], filters: Filter | Filter[], config?: EsQueryConfig): {
    bool: BoolQuery;
};
export {};
