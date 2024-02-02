/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange, Filter, Query, AggregateQuery } from '@kbn/es-query';
import { PublishingSubject, useStateFromPublishingSubject } from '../publishing_subject';

export interface PublishesLocalUnifiedSearch {
  isCompatibleWithLocalUnifiedSearch?: () => boolean;
  localTimeRange: PublishingSubject<TimeRange | undefined>;
  getFallbackTimeRange?: () => TimeRange | undefined;
  localFilters: PublishingSubject<Filter[] | undefined>;
  localQuery: PublishingSubject<Query | AggregateQuery | undefined>;
}

export type PublishesWritableLocalUnifiedSearch = PublishesLocalUnifiedSearch & {
  setLocalTimeRange: (timeRange: TimeRange | undefined) => void;
  setLocalFilters: (filters: Filter[] | undefined) => void;
  setLocalQuery: (query: Query | undefined) => void;
};

export const apiPublishesLocalUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesLocalUnifiedSearch => {
  return Boolean(
    unknownApi &&
      (unknownApi as PublishesLocalUnifiedSearch)?.localTimeRange !== undefined &&
      (unknownApi as PublishesLocalUnifiedSearch)?.localFilters !== undefined &&
      (unknownApi as PublishesLocalUnifiedSearch)?.localQuery !== undefined
  );
};

export const apiPublishesPartialLocalUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is Partial<PublishesLocalUnifiedSearch> => {
  return Boolean(
    (unknownApi && (unknownApi as PublishesLocalUnifiedSearch)?.localTimeRange !== undefined) ||
      (unknownApi as PublishesLocalUnifiedSearch)?.localFilters !== undefined ||
      (unknownApi as PublishesLocalUnifiedSearch)?.localQuery !== undefined
  );
};

export const apiPublishesWritableLocalUnifiedSearch = (
  unknownApi: null | unknown
): unknownApi is PublishesWritableLocalUnifiedSearch => {
  return (
    apiPublishesLocalUnifiedSearch(unknownApi) &&
    (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalTimeRange !== undefined &&
    typeof (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalTimeRange === 'function' &&
    (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalFilters !== undefined &&
    typeof (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalFilters === 'function' &&
    (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalQuery !== undefined &&
    typeof (unknownApi as PublishesWritableLocalUnifiedSearch).setLocalQuery === 'function'
  );
};

/**
 * A hook that gets this API's local time range as a reactive variable which will cause re-renders on change.
 */
export const useLocalTimeRange = (api: Partial<PublishesLocalUnifiedSearch> | undefined) =>
  useStateFromPublishingSubject(api?.localTimeRange);

/**
 * A hook that gets this API's local filters as a reactive variable which will cause re-renders on change.
 */
export const useLocalFilters = (api: Partial<PublishesLocalUnifiedSearch> | undefined) =>
  useStateFromPublishingSubject(api?.localFilters);

/**
 * A hook that gets this API's local query as a reactive variable which will cause re-renders on change.
 */
export const useLocalQuery = (api: Partial<PublishesLocalUnifiedSearch> | undefined) =>
  useStateFromPublishingSubject(api?.localQuery);
