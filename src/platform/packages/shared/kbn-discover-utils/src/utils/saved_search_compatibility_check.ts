/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { apiPublishesSavedSearch, type SearchEmbeddableApi } from '@kbn/discover-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import {
  type EmbeddableApiContext,
  type PublishesDataViews,
  type PublishingSubject,
  apiCanAccessViewMode,
  apiPublishesQuery,
  apiPublishesFilters,
  apiHasType,
  apiIsOfType,
  getInheritedViewMode,
  apiPublishesTimeRange,
} from '@kbn/presentation-publishing';
import { SEARCH_EMBEDDABLE_TYPE } from '../..';

type SearchEmbeddableApiWithAtLeastOneDataView = Omit<
  SearchEmbeddableApi,
  'dataViews$' | 'timeRange$'
> & {
  dataViews$: PublishingSubject<DataView[]>;
  timeRange$: PublishingSubject<TimeRange>;
};

export const apiPublishesDataViews = (
  api: EmbeddableApiContext['embeddable']
): api is PublishesDataViews => {
  const embeddable = api as PublishesDataViews;
  return Boolean(embeddable.dataViews$);
};

export const apiHasAtLeastOneDataView = (
  api: EmbeddableApiContext['embeddable']
): api is SearchEmbeddableApiWithAtLeastOneDataView => {
  const embeddable = api as PublishesDataViews;
  if (!apiPublishesDataViews(embeddable)) {
    return false;
  }
  return Boolean(embeddable.dataViews$ && (embeddable.dataViews$.getValue()?.length ?? 0) > 0);
};

export const apiHasTimeRange = (
  api: EmbeddableApiContext['embeddable']
): api is SearchEmbeddableApiWithAtLeastOneDataView => {
  const embeddable = api as PublishesDataViews;
  if (!apiPublishesTimeRange(embeddable)) {
    return false;
  }
  const timeRange = embeddable.timeRange$.getValue();
  return Boolean(timeRange && timeRange.from && timeRange.to);
};

export const isSavedSearchApi = (
  api: EmbeddableApiContext['embeddable']
): api is SearchEmbeddableApiWithAtLeastOneDataView => {
  return (
    apiCanAccessViewMode(api) &&
    getInheritedViewMode(api) === 'view' &&
    apiHasType(api) &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE) &&
    apiPublishesSavedSearch(api) &&
    apiHasAtLeastOneDataView(api) &&
    apiPublishesQuery(api) &&
    apiPublishesFilters(api) &&
    apiPublishesTimeRange(api)
  );
};
