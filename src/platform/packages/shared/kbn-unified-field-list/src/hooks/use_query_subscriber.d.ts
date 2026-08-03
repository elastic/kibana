import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery, Query, Filter } from '@kbn/es-query';
import type { TimeRangeUpdatesType, SearchMode } from '../types';
/**
 * Hook params
 */
export interface QuerySubscriberParams {
    data: DataPublicPluginStart;
    /**
     * Pass `timefilter` only if you are not using search sessions for the global search
     */
    timeRangeUpdatesType?: TimeRangeUpdatesType;
}
/**
 * Result from the hook
 */
export interface QuerySubscriberResult {
    query: Query | AggregateQuery | undefined;
    filters: Filter[] | undefined;
    fromDate: string | undefined;
    toDate: string | undefined;
    searchMode: SearchMode | undefined;
}
/**
 * Memorizes current query, filters and absolute date range
 * @param data
 * @param timeRangeUpdatesType
 * @public
 */
export declare const useQuerySubscriber: ({ data, timeRangeUpdatesType, }: QuerySubscriberParams) => QuerySubscriberResult;
/**
 * Checks if query result is ready to be used
 * @param result
 * @public
 */
export declare const hasQuerySubscriberData: (result: QuerySubscriberResult) => result is {
    query: Query | AggregateQuery;
    filters: Filter[];
    fromDate: string;
    toDate: string;
    searchMode: SearchMode;
};
/**
 * Determines current search mode
 * @param query
 */
export declare function getSearchMode(query?: Query | AggregateQuery): SearchMode | undefined;
