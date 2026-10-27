/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import { isCombinedFilter, isFilterPinned } from '@kbn/es-query';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverDataSource } from '../data_sources';
import { createDataViewDataSource, isDataViewSource } from '../data_sources';
import { getInitialDataViewId } from './initial_data_view';
import {
  generateInlineDataViewId,
  getInlineDataView,
  type InlineDataViewIdentity,
} from './inline_data_view';
import type {
  DataViewIdMap,
  InlineDataViewIdCompatibility,
} from './inline_data_view_id_compatibility';

export interface InlineDataViewReferenceContext {
  idCompatibility: InlineDataViewIdCompatibility;
  documentSearchSource?: SerializedSearchSourceFields;
}

interface DataViewReferenceState {
  dataSource?: DiscoverDataSource;
  filters?: Filter[];
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

/** Remaps filter references that are not owned by a specific inline view. */
export const remapSharedFilterDataViewIds = (
  filters: Filter[],
  { shared }: InlineDataViewIdCompatibility
): Filter[] => remapFilterDataViewIds(filters, shared);

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

const getImplicitDocumentIdentity = (searchSource: SerializedSearchSourceFields | undefined) => {
  const identity = getInlineDataViewIdentity(searchSource);

  return identity?.dataView.id === undefined ? identity : undefined;
};

const bindInlineAppFilters = ({
  filters,
  identity,
  documentIdentity,
  targetId,
}: {
  filters: Filter[] | undefined;
  identity: InlineDataViewIdentity | undefined;
  documentIdentity: InlineDataViewIdentity | undefined;
  targetId: string | undefined;
}) => {
  if (!filters || !identity || targetId === undefined) {
    return filters;
  }

  // A restored copy inherits the convention only from its associated ID-less document.
  const hasImplicitReferences = !identity.dataView.id || documentIdentity !== undefined;
  const targetsTabView = targetId === identity.id || targetId === documentIdentity?.id;

  if (hasImplicitReferences && targetsTabView) {
    return bindUnreferencedAppFilters(filters, targetId);
  }

  return filters;
};

/** Remaps references in app or global state without changing unrelated state or binding filters. */
export const remapDataViewReferences = <T extends DataViewReferenceState>(
  state: T,
  idMap: DataViewIdMap
): T => {
  const normalized = { ...state };
  const { dataSource, filters } = state;

  if (isDataViewSource(dataSource)) {
    const id = idMap.get(dataSource.dataViewId);
    if (id !== undefined) {
      normalized.dataSource = createDataViewDataSource({ dataViewId: id });
    }
  }

  if (filters) {
    normalized.filters = remapFilterDataViewIds(filters, idMap);
  }

  return normalized.dataSource === dataSource && normalized.filters === filters
    ? state
    : normalized;
};

type VisContextUnmapped = NonNullable<DiscoverSessionTab['visContext']>;
type VisContextWithRequestData = Extract<VisContextUnmapped, { requestData: object }>;

const hasRequestData = (visContext: VisContextUnmapped): visContext is VisContextWithRequestData =>
  'requestData' in visContext && Boolean(visContext.requestData);

/** Remaps the view in a saved chart's request data, which the chart requires to match the tab view. */
export const remapVisContextDataViewId = <T extends VisContextUnmapped | undefined>(
  visContext: T,
  idMap: DataViewIdMap
): T => {
  if (!visContext || !hasRequestData(visContext)) {
    return visContext;
  }

  const { requestData } = visContext;
  const id = requestData.dataViewId === undefined ? undefined : idMap.get(requestData.dataViewId);
  if (id === undefined) {
    return visContext;
  }

  return { ...visContext, requestData: { ...requestData, dataViewId: id } };
};

/** Normalizes a tab's app references using its own definition and associated document. */
export const normalizeInlineAppState = <T extends DataViewReferenceState>(
  state: T,
  {
    searchSource,
    documentSearchSource,
    idCompatibility,
  }: InlineDataViewReferenceContext & {
    searchSource: SerializedSearchSourceFields | undefined;
  }
): T => {
  const identity = getInlineDataViewIdentity(searchSource);
  const documentIdentity = getImplicitDocumentIdentity(documentSearchSource);
  const normalized = remapDataViewReferences(state, idCompatibility.forView(identity));
  const { dataSource } = normalized;
  if (dataSource !== undefined && !isDataViewSource(dataSource)) {
    return normalized;
  }

  const targetId = getInitialDataViewId({
    dataSource,
    documentDataViewId: documentIdentity?.id,
    restoredDataViewId: identity?.id,
  });
  const filters = bindInlineAppFilters({
    filters: normalized.filters,
    identity,
    documentIdentity,
    targetId,
  });

  return filters === normalized.filters ? normalized : { ...normalized, filters };
};

/** Normalizes an inline definition and its own filters with the maps of its load. */
export const normalizeInlineSearchSource = (
  searchSource: SerializedSearchSourceFields,
  { idCompatibility, documentSearchSource }: InlineDataViewReferenceContext
): SerializedSearchSourceFields => {
  const identity = getInlineDataViewIdentity(searchSource);
  const documentIdentity = getImplicitDocumentIdentity(documentSearchSource);
  const normalized = { ...searchSource };

  if (normalized.filter) {
    normalized.filter = remapFilterDataViewIds(
      normalized.filter,
      idCompatibility.forView(identity),
      idCompatibility.shared
    );
    normalized.filter = bindInlineAppFilters({
      filters: normalized.filter,
      identity,
      documentIdentity,
      targetId: identity?.id,
    });
  }

  if (identity) {
    normalized.index = { ...identity.dataView, id: identity.id };
  }

  const hasDerivedId = !identity || identity.dataView.id === identity.id;
  const isUnchanged = hasDerivedId && normalized.filter === searchSource.filter;

  return isUnchanged ? searchSource : normalized;
};
