/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange, Filter, Query, AggregateQuery } from '@kbn/es-query';
import { PublishingSubject } from '../../publishing_subject';

export interface PublishesTimeRange {
  timeRange$: PublishingSubject<TimeRange | undefined>;
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
