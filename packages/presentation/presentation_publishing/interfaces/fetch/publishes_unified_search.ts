/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { useEffect, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { PublishingSubject } from '../../publishing_subject';

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

export type PublishesUnifiedSearch = PublishesTimeRange &
  PublishesFilters & {
    isCompatibleWithUnifiedSearch?: () => boolean;
    query$: PublishingSubject<Query | AggregateQuery | undefined>;
  };

export type PublishesWritableUnifiedSearch = PublishesUnifiedSearch &
  PublishesWritableTimeRange & {
    setFilters: (filters: Filter[] | undefined) => void;
    setQuery: (query: Query | undefined) => void;
  };

export const apiPublishesTimeslice = (
  unknownApi: null | unknown
): unknownApi is PublishesTimeslice => {
  return Boolean(unknownApi && (unknownApi as PublishesTimeslice)?.timeslice$ !== undefined);
};

export const apiPublishesTimeRange = (
  unknownApi: null | unknown
): unknownApi is PublishesTimeRange => {
  return Boolean(unknownApi && (unknownApi as PublishesTimeRange)?.timeRange$ !== undefined);
};

export const apiPublishesFilters = (unknownApi: unknown): unknownApi is PublishesFilters => {
  return Boolean(unknownApi && (unknownApi as PublishesFilters)?.filters$ !== undefined);
};

export const apiPublishesUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesUnifiedSearch => {
  return Boolean(
    unknownApi &&
      apiPublishesTimeRange(unknownApi) &&
      apiPublishesFilters(unknownApi) &&
      (unknownApi as PublishesUnifiedSearch)?.query$ !== undefined
  );
};

export const apiPublishesPartialUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is Partial<PublishesUnifiedSearch> => {
  return Boolean(
    apiPublishesTimeRange(unknownApi) ||
      apiPublishesFilters(unknownApi) ||
      (unknownApi as PublishesUnifiedSearch)?.query$ !== undefined
  );
};

export const apiPublishesWritableUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesWritableUnifiedSearch => {
  return (
    apiPublishesUnifiedSearch(unknownApi) &&
    typeof (unknownApi as PublishesWritableUnifiedSearch).setTimeRange === 'function' &&
    typeof (unknownApi as PublishesWritableUnifiedSearch).setFilters === 'function' &&
    typeof (unknownApi as PublishesWritableUnifiedSearch).setQuery === 'function'
  );
};

/**
 * React hook that converts search props into search observable API
 */
export function useSearchApi({
  filters,
  query,
  timeRange,
}: {
  filters?: Filter[];
  query?: Query | AggregateQuery;
  timeRange?: TimeRange;
}) {
  const searchApi = useMemo(() => {
    return {
      filters$: new BehaviorSubject<Filter[] | undefined>(filters),
      query$: new BehaviorSubject<Query | AggregateQuery | undefined>(query),
      timeRange$: new BehaviorSubject<TimeRange | undefined>(timeRange),
    };
    // filters, query, timeRange only used as initial values. Changes do not effect memoized value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    searchApi.filters$.next(filters);
  }, [filters, searchApi.filters$]);

  useEffect(() => {
    searchApi.query$.next(query);
  }, [query, searchApi.query$]);

  useEffect(() => {
    searchApi.timeRange$.next(timeRange);
  }, [timeRange, searchApi.timeRange$]);

  return searchApi;
}
