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
  if (!dataView) {
    return undefined;
  }

  return { dataView, id: generateInlineDataViewId(dataView) };
};

/**
 * Replaces exact Data View references, including those nested in combined filters. Pinned filters,
 * shared by every view, use their own map.
 */
export const remapFilterDataViewIds = (
  filters: Filter[],
  idMap: DataViewIdMap,
  pinnedIdMap: DataViewIdMap = idMap
): Filter[] => {
  const translatedFilters = filters.map((filter) => {
    const filterIdMap = isFilterPinned(filter) ? pinnedIdMap : idMap;
    const meta = { ...filter.meta };

    // Nested filters are translated with the map of their group.
    if (isCombinedFilter(filter)) {
      meta.params = remapFilterDataViewIds(filter.meta.params, filterIdMap);
    }

    if (meta.index !== undefined && filterIdMap.has(meta.index)) {
      meta.index = filterIdMap.get(meta.index);
    }

    const isUnchanged = meta.params === filter.meta.params && meta.index === filter.meta.index;

    return isUnchanged ? filter : { ...filter, meta };
  });

  const isUnchanged = translatedFilters.every((filter, index) => filter === filters[index]);

  return isUnchanged ? filters : translatedFilters;
};

/** Binds unreferenced app filters recursively, inheriting group references and skipping pinned trees. */
export const bindUnreferencedAppFilters = (filters: Filter[], dataViewId: string): Filter[] => {
  const boundFilters = filters.map((filter) => {
    if (isFilterPinned(filter)) {
      return filter;
    }

    // Nested filters inherit the reference of their group.
    const meta = { ...filter.meta, index: filter.meta.index ?? dataViewId };
    if (isCombinedFilter(filter)) {
      meta.params = bindUnreferencedAppFilters(filter.meta.params, meta.index);
    }

    const isUnchanged = meta.params === filter.meta.params && meta.index === filter.meta.index;

    return isUnchanged ? filter : { ...filter, meta };
  });

  const isUnchanged = boundFilters.every((filter, index) => filter === filters[index]);

  return isUnchanged ? filters : boundFilters;
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
  const normalized = { ...searchSource };

  if (normalized.filter) {
    normalized.filter = remapFilterDataViewIds(normalized.filter, ownDataViewIdMap, dataViewIdMap);
  }

  if (identity && bindUnreferencedFilters && normalized.filter) {
    normalized.filter = bindUnreferencedAppFilters(normalized.filter, identity.id);
  }

  if (identity) {
    normalized.index = { ...identity.dataView, id: identity.id };
  }

  const hasDerivedId = !identity || identity.dataView.id === identity.id;
  const isUnchanged = hasDerivedId && normalized.filter === searchSource.filter;

  return isUnchanged ? searchSource : normalized;
};
