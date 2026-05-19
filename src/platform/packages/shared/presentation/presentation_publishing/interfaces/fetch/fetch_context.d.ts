import type { AggregateQuery, Filter, Query, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
export interface FetchContext {
    isReload: boolean;
    filters: Filter[] | undefined;
    query: Query | AggregateQuery | undefined;
    searchSessionId: string | undefined;
    timeRange: TimeRange | undefined;
    timeslice: [number, number] | undefined;
    esqlVariables: ESQLControlVariable[] | undefined;
    projectRouting: ProjectRouting | undefined;
}
export interface ReloadTimeFetchContext extends Omit<FetchContext, 'isReload'> {
    reloadTimestamp?: number;
}
export declare function isReloadTimeFetchContextEqual(previousContext: ReloadTimeFetchContext, currentContext: ReloadTimeFetchContext): boolean;
export declare const areFiltersEqualForFetch: (currentFilters?: Filter[], lastFilters?: Filter[]) => boolean;
export declare const isReloadTimestampEqualForFetch: (previousReloadTimestamp?: number, currentReloadTimestamp?: number) => boolean;
export declare const isQueryEqualForFetch: (currentQuery: Query | AggregateQuery | undefined, lastQuery: Query | AggregateQuery | undefined) => boolean;
export declare const isTimeRangeEqualForFetch: (currentTimeRange: TimeRange | undefined, lastTimeRange: TimeRange | undefined) => boolean;
export declare const isTimeSliceEqualForFetch: (currentTimeslice: [number, number] | undefined, lastTimeslice: [number, number] | undefined) => boolean;
