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

/** Maps previous inline IDs to derived IDs, leaving out IDs that refer to more than one spec. */
export const createInlineDataViewIdMap = (
  identities: Array<InlineDataViewIdentity | undefined>
): DataViewIdMap => {
  const targetIdsById = new Map<string, Set<string>>();
  for (const identity of identities) {
    const previousId = identity?.dataView.id;
    if (!identity || previousId === undefined) {
      continue;
    }

    const targetIds = targetIdsById.get(previousId) ?? new Set<string>();
    targetIds.add(identity.id);
    targetIdsById.set(previousId, targetIds);
  }

  const dataViewIdMap = new Map<string, string>();
  for (const [previousId, targetIds] of targetIdsById) {
    const [targetId] = targetIds;
    if (targetIds.size === 1 && targetId !== previousId) {
      dataViewIdMap.set(previousId, targetId);
    }
  }

  return dataViewIdMap;
};

/** Adds the previous ID of a representation, which always refers to its own spec. */
export const withOwnInlineDataViewId = (
  identity: InlineDataViewIdentity | undefined,
  dataViewIdMap: DataViewIdMap
): DataViewIdMap => {
  const previousId = identity?.dataView.id;
  if (!identity || previousId === undefined || previousId === identity.id) {
    return dataViewIdMap;
  }

  return new Map([...dataViewIdMap, [previousId, identity.id]]);
};

/** Replaces exact Data View references, including those nested in combined filters. */
export const translateFilterDataViewIds = (filters: Filter[], idMap: DataViewIdMap): Filter[] => {
  const translatedFilters = filters.map((filter) => {
    let translatedFilter = filter;

    if (isCombinedFilter(filter)) {
      const params = translateFilterDataViewIds(filter.meta.params, idMap);
      if (params !== filter.meta.params) {
        translatedFilter = { ...filter, meta: { ...filter.meta, params } };
      }
    }

    const { index } = translatedFilter.meta;
    const translatedIndex = index === undefined ? undefined : idMap.get(index);
    if (translatedIndex === undefined) {
      return translatedFilter;
    }

    return { ...translatedFilter, meta: { ...translatedFilter.meta, index: translatedIndex } };
  });

  return translatedFilters.every((filter, index) => filter === filters[index])
    ? filters
    : translatedFilters;
};

/** Binds app filters without a reference to a view; pinned filters and explicit references stay. */
export const bindUnreferencedAppFilters = (filters: Filter[], dataViewId: string): Filter[] => {
  const isUnreferencedAppFilter = (filter: Filter) =>
    filter.meta.index === undefined && !isFilterPinned(filter);

  return filters.some(isUnreferencedAppFilter)
    ? filters.map((filter) =>
        isUnreferencedAppFilter(filter)
          ? { ...filter, meta: { ...filter.meta, index: dataViewId } }
          : filter
      )
    : filters;
};

/**
 * Gives the inline view of a search source its derived ID and translates the references it owns,
 * optionally binding its app filters without a reference to that view.
 */
export const normalizeInlineSearchSource = ({
  searchSource,
  identity,
  idMap,
  bindUnreferencedFilters,
}: {
  searchSource: SerializedSearchSourceFields;
  identity: InlineDataViewIdentity | undefined;
  idMap: DataViewIdMap;
  bindUnreferencedFilters: boolean;
}): SerializedSearchSourceFields => {
  const { filter } = searchSource;
  let normalizedFilter = filter && translateFilterDataViewIds(filter, idMap);

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
