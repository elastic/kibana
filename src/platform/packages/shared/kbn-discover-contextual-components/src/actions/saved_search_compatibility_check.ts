/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE, type PublishesSavedSearch } from '@kbn/discover-utils';
import { DataView } from '@kbn/data-views-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { type SearchEmbeddableApi } from '@kbn/discover-utils';
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

type SearchEmbeddableApiWithAtLeastOneDataView = Omit<SearchEmbeddableApi, 'dataViews$'> & {
  dataViews$: PublishingSubject<DataView[]>;
  timeRange$: PublishingSubject<TimeRange>;
};

export const apiPublishesSavedSearch = (
  api: EmbeddableApiContext['embeddable']
): api is PublishesSavedSearch => {
  const embeddable = api as PublishesSavedSearch;
  return Boolean(embeddable.savedSearch$);
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
