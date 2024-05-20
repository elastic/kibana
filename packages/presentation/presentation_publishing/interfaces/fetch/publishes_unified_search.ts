/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject } from 'rxjs';
import { TimeRange, Filter, Query, AggregateQuery } from '@kbn/es-query';
import { useEffect, useMemo } from 'react';
import { PublishingSubject } from '../../publishing_subject';

export interface PublishesTimeRange {
  timeRange$: PublishingSubject<TimeRange | undefined>;
  timeRestore$?: PublishingSubject<boolean | undefined>;
  timeslice$?: PublishingSubject<[number, number] | undefined>;
}

export type PublishesWritableTimeRange = PublishesTimeRange & {
  setTimeRange: (timeRange: TimeRange | undefined) => void;
};

export type PublishesUnifiedSearch = PublishesTimeRange & {
  isCompatibleWithUnifiedSearch?: () => boolean;
  filters$: PublishingSubject<Filter[] | undefined>;
  query$: PublishingSubject<Query | AggregateQuery | undefined>;
};

export type PublishesWritableUnifiedSearch = PublishesUnifiedSearch &
  PublishesWritableTimeRange & {
    setFilters: (filters: Filter[] | undefined) => void;
    setQuery: (query: Query | undefined) => void;
  };

export const apiPublishesTimeRange = (
  unknownApi: null | unknown
): unknownApi is PublishesTimeRange => {
  return Boolean(unknownApi && (unknownApi as PublishesTimeRange)?.timeRange$ !== undefined);
};

export const apiPublishesUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesUnifiedSearch => {
  return Boolean(
    unknownApi &&
      apiPublishesTimeRange(unknownApi) &&
      (unknownApi as PublishesUnifiedSearch)?.filters$ !== undefined &&
      (unknownApi as PublishesUnifiedSearch)?.query$ !== undefined
  );
};

export const apiPublishesPartialUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is Partial<PublishesUnifiedSearch> => {
  return Boolean(
    apiPublishesTimeRange(unknownApi) ||
      (unknownApi as PublishesUnifiedSearch)?.filters$ !== undefined ||
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
