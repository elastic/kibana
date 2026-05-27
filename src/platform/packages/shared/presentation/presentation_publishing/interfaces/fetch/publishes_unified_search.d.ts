import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import type { PublishingSubject } from '../../publishing_subject';
export interface PublishesTimeslice {
    timeslice$: PublishingSubject<[number, number] | undefined>;
}
export interface PublishesTimeRange extends Partial<PublishesTimeslice> {
    timeRange$: PublishingSubject<TimeRange | undefined>;
    timeRestore$?: PublishingSubject<boolean | undefined>;
}
export type PublishesWritableTimeRange = PublishesTimeRange & {
    setTimeRange: (timeRange: TimeRange | undefined) => void;
};
export interface PublishesFilters {
    filters$: PublishingSubject<Filter[] | undefined>;
}
export type PublishesUnifiedSearch = PublishesTimeRange & PublishesFilters & {
    isCompatibleWithUnifiedSearch?: () => boolean;
    canEditUnifiedSearch?: () => boolean;
    query$: PublishingSubject<Query | AggregateQuery | undefined>;
};
export type PublishesWritableUnifiedSearch = PublishesUnifiedSearch & PublishesWritableTimeRange & {
    setFilters: (filters: Filter[] | undefined) => void;
    setQuery: (query: Query | undefined) => void;
};
export declare const apiPublishesTimeslice: (unknownApi: null | unknown) => unknownApi is PublishesTimeslice;
export declare const apiPublishesTimeRange: (unknownApi: null | unknown) => unknownApi is PublishesTimeRange;
export declare const apiPublishesFilters: (unknownApi: unknown) => unknownApi is PublishesFilters;
export declare const apiPublishesUnifiedSearch: (unknownApi: null | unknown) => unknownApi is PublishesUnifiedSearch;
export declare const apiPublishesPartialUnifiedSearch: (unknownApi: null | unknown) => unknownApi is Partial<PublishesUnifiedSearch>;
export declare const apiPublishesWritableUnifiedSearch: (unknownApi: null | unknown) => unknownApi is PublishesWritableUnifiedSearch;
/**
 * React hook that converts search props into search observable API
 */
export declare function useSearchApi({ filters, query, timeRange, }: {
    filters?: Filter[];
    query?: Query | AggregateQuery;
    timeRange?: TimeRange;
}): {
    filters$: BehaviorSubject<Filter[] | undefined>;
    query$: BehaviorSubject<Query | AggregateQuery | undefined>;
    timeRange$: BehaviorSubject<TimeRange | undefined>;
};
