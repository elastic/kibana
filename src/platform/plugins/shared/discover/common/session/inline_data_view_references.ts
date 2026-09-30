/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { isCombinedFilter, isFilterPinned } from '@kbn/es-query';
import { generateInlineDataViewId, getInlineDataView } from './inline_data_view';

export type DataViewIdMap = ReadonlyMap<string, string>;

export interface InlineDataViewIdentity {
  dataView: DataViewSpec;
  id: string;
}

/** Returns the inline view of a search source with the ID derived from its spec. */
export const getInlineDataViewIdentity = (
  searchSource: SerializedSearchSourceFields | undefined
): InlineDataViewIdentity | undefined => {
  const dataView = getInlineDataView(searchSource);

  return dataView ? { dataView, id: generateInlineDataViewId(dataView) } : undefined;
};

/**
 * Replaces exact Data View references, including those nested in combined filters. Pinned filters,
 * shared by every view, use their own map.
 */
export const translateFilterDataViewIds = (
  filters: Filter[],
  idMap: DataViewIdMap,
  pinnedIdMap: DataViewIdMap = idMap
): Filter[] => {
  const translatedFilters = filters.map((filter) => {
    const filterIdMap = isFilterPinned(filter) ? pinnedIdMap : idMap;
    let translatedFilter = filter;

    if (isCombinedFilter(filter)) {
      const params = translateFilterDataViewIds(filter.meta.params, filterIdMap);
      if (params !== filter.meta.params) {
        translatedFilter = { ...filter, meta: { ...filter.meta, params } };
      }
    }

    const { index } = translatedFilter.meta;
    const translatedIndex = index === undefined ? undefined : filterIdMap.get(index);
    if (translatedIndex === undefined) {
      return translatedFilter;
    }

    return { ...translatedFilter, meta: { ...translatedFilter.meta, index: translatedIndex } };
  });

  return translatedFilters.every((filter, index) => filter === filters[index])
    ? filters
    : translatedFilters;
};

/** Binds unreferenced app filters recursively, inheriting group references and skipping pinned trees. */
export const bindUnreferencedAppFilters = (filters: Filter[], dataViewId: string): Filter[] => {
  const boundFilters = filters.map((filter) => {
    if (isFilterPinned(filter)) {
      return filter;
    }

    const index = filter.meta.index ?? dataViewId;
    let boundFilter = filter;
    if (isCombinedFilter(filter)) {
      const params = bindUnreferencedAppFilters(filter.meta.params, index);
      if (params !== filter.meta.params) {
        boundFilter = { ...filter, meta: { ...filter.meta, params } };
      }
    }

    return filter.meta.index === undefined
      ? { ...boundFilter, meta: { ...boundFilter.meta, index } }
      : boundFilter;
  });

  return boundFilters.every((filter, index) => filter === filters[index]) ? filters : boundFilters;
};

/** Normalizes an inline view and its filters using supplied maps, optionally binding unreferenced app filters. */
export const normalizeInlineSearchSource = ({
  searchSource,
  identity,
  ownDataViewIdMap,
  dataViewIdMap,
  bindUnreferencedFilters,
}: {
  searchSource: SerializedSearchSourceFields;
  identity: InlineDataViewIdentity | undefined;
  ownDataViewIdMap: DataViewIdMap;
  dataViewIdMap: DataViewIdMap;
  bindUnreferencedFilters: boolean;
}): SerializedSearchSourceFields => {
  const { filter } = searchSource;
  let normalizedFilter =
    filter && translateFilterDataViewIds(filter, ownDataViewIdMap, dataViewIdMap);

  if (identity && bindUnreferencedFilters && normalizedFilter) {
    normalizedFilter = bindUnreferencedAppFilters(normalizedFilter, identity.id);
  }

  if ((!identity || identity.dataView.id === identity.id) && normalizedFilter === filter) {
    return searchSource;
  }

  return {
    ...searchSource,
    ...(identity && { index: { ...identity.dataView, id: identity.id } }),
    ...(normalizedFilter !== filter && { filter: normalizedFilter }),
  };
};
