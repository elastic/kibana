/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import {
  extractTabs,
  type SavedSearchByValueAttributes,
  SavedSearchType,
  VIEW_MODE,
} from '@kbn/saved-search-plugin/common';
import { DataGridDensity } from '@kbn/discover-utils';
import type { DataViewSpec, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { extractReferences } from '@kbn/data-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { fromStoredFilters, toStoredFilters } from '@kbn/as-code-filters-transforms';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import type {
  DiscoverSessionClassicTab,
  DiscoverSessionDataset,
  DiscoverSessionDataViewSpec,
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
  DiscoverSessionEmbeddableState,
  DiscoverSessionTab,
} from '../../server';
import type {
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './constants';

export function isByReferenceSavedSearchEmbeddableState(
  state: StoredSearchEmbeddableState
): state is StoredSearchEmbeddableByReferenceState {
  return !('attributes' in state);
}

export function isByReferenceDiscoverSessionEmbeddableState(
  state: DiscoverSessionEmbeddableState
): state is DiscoverSessionEmbeddableByReferenceState {
  return 'discover_session_id' in state;
}

export function savedSearchToDiscoverSessionEmbeddableState(
  storedSearch: StoredSearchEmbeddableState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableState {
  return isByReferenceSavedSearchEmbeddableState(storedSearch)
    ? byReferenceSavedSearchToDiscoverSessionEmbeddableState(storedSearch, references)
    : byValueSavedSearchToDiscoverSessionEmbeddableState(storedSearch, references);
}

export function discoverSessionToSavedSearchEmbeddableState(
  apiState: DiscoverSessionEmbeddableState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableState; references: SavedObjectReference[] } {
  return isByReferenceDiscoverSessionEmbeddableState(apiState)
    ? byReferenceDiscoverSessionToSavedSearchEmbeddableState(apiState, references)
    : byValueDiscoverSessionToSavedSearchEmbeddableState(apiState, references);
}

export function byReferenceSavedSearchToDiscoverSessionEmbeddableState(
  storedSearch: StoredSearchEmbeddableByReferenceState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableByReferenceState {
  const { title, description, time_range: timeRange } = storedSearch;
  const savedObjectRef = references.find(
    (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
  );
  if (!savedObjectRef) throw new Error(`Missing reference of type "${SavedSearchType}"`);
  return {
    title,
    description,
    time_range: timeRange,
    discover_session_id: savedObjectRef.id,
    selected_tab_id: undefined, // Waiting on https://github.com/elastic/kibana/pull/252311
  };
}

export function byReferenceDiscoverSessionToSavedSearchEmbeddableState(
  apiState: DiscoverSessionEmbeddableByReferenceState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableByReferenceState; references: SavedObjectReference[] } {
  const discoverSessionReference: SavedObjectReference = {
    name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
    type: SavedSearchType,
    id: apiState.discover_session_id,
  };
  const { discover_session_id, selected_tab_id, time_range: timeRange, ...state } = apiState;
  return {
    state: { ...state, time_range: timeRange },
    references: [discoverSessionReference, ...references],
  };
}

export function byValueSavedSearchToDiscoverSessionEmbeddableState(
  storedSearch: StoredSearchEmbeddableByValueState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableByValueState {
  const { title, description, time_range: timeRange } = storedSearch;
  const [tab] = storedSearch.attributes.tabs ?? extractTabs(storedSearch.attributes).tabs;
  const {
    columns,
    grid,
    sort,
    rowHeight,
    headerRowHeight,
    rowsPerPage,
    sampleSize,
    viewMode,
    density,
    kibanaSavedObjectMeta: { searchSourceJSON },
  } = tab.attributes;

  const sharedAttrs = {
    columns: fromStoredColumns(columns, grid),
    sort: fromStoredSort(sort),
    view_mode: viewMode ?? VIEW_MODE.DOCUMENT_LEVEL,
    density: density ?? DataGridDensity.COMPACT,
    header_row_height: (headerRowHeight === undefined || headerRowHeight === -1
      ? 'auto'
      : headerRowHeight) as DiscoverSessionTab['header_row_height'],
    row_height: (rowHeight === undefined || rowHeight === -1
      ? 'auto'
      : rowHeight) as DiscoverSessionTab['row_height'],
  };

  const searchSourceValues = parseSearchSourceJSON(searchSourceJSON);
  const searchSourceFields = injectReferences(searchSourceValues, references);
  const { index, query, filter } = searchSourceFields;

  const newTab: DiscoverSessionTab = isOfAggregateQueryType(query)
    ? {
        ...sharedAttrs,
        query,
      }
    : {
        ...sharedAttrs,
        query,
        filters: fromStoredFilters(filter) ?? [],
        rows_per_page: rowsPerPage as DiscoverSessionClassicTab['rows_per_page'],
        sample_size: sampleSize,
        dataset: fromStoredDataset(index),
      };

  return {
    title,
    description,
    time_range: timeRange,
    tabs: [newTab],
  };
}

export function byValueDiscoverSessionToSavedSearchEmbeddableState(
  apiState: DiscoverSessionEmbeddableByValueState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableByValueState; references: SavedObjectReference[] } {
  if (!apiState.tabs?.length) {
    throw new Error('Discover session by-value state must have at least one tab');
  }
  const {
    tabs: [tab],
    ...state
  } = apiState;

  const searchSourceValues = {
    index: 'dataset' in tab ? toStoredDataset(tab.dataset) : undefined,
    query: tab.query,
    filter: 'filters' in tab ? toStoredFilters(tab.filters) : undefined,
  };
  const [, searchSourceReferences] = extractReferences(searchSourceValues);

  const sharedAttrs: DiscoverSessionTabAttributes = {
    sort: toStoredSort(tab.sort),
    columns: toStoredColumns(tab.columns),
    grid: toStoredGrid(tab.columns),
    hideChart: false,
    isTextBasedQuery: !('dataset' in tab),
    viewMode: tab.view_mode,
    rowHeight: tab.row_height === 'auto' || tab.row_height === undefined ? -1 : tab.row_height,
    headerRowHeight:
      tab.header_row_height === 'auto' || tab.header_row_height === undefined
        ? -1
        : tab.header_row_height,
    density: tab.density,
    ...('sample_size' in tab && { sampleSize: tab.sample_size }),
    ...('rows_per_page' in tab && { rowsPerPage: tab.rows_per_page }),
    kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSourceValues) },
  };
  const attributes: SavedSearchByValueAttributes = {
    title: apiState.title ?? '',
    description: apiState.description ?? '',
    ...sharedAttrs,
    sort: sharedAttrs.sort as SavedSearchByValueAttributes['sort'],
    columns: sharedAttrs.columns as SavedSearchByValueAttributes['columns'],
    tabs: [
      {
        id: '', // Unused for byValue but required for schema validation
        label: '', // Unused for byValue but required for schema validation
        attributes: sharedAttrs,
      },
    ],
  };
  return {
    state: { ...state, attributes },
    references: [...references, ...searchSourceReferences],
  };
}

export function fromStoredColumns(
  columns: DiscoverSessionTabAttributes['columns'],
  grid: DiscoverSessionTabAttributes['grid']
): DiscoverSessionTab['columns'] {
  return columns.map((name) => ({
    name,
    ...(grid.columns?.[name] && { width: grid.columns?.[name]?.width }),
  }));
}

export function toStoredColumns(
  columns: DiscoverSessionTab['columns'] = []
): DiscoverSessionTabAttributes['columns'] {
  return columns.map((c) => c.name);
}

export function toStoredGrid(
  columns: DiscoverSessionTab['columns'] = []
): DiscoverSessionTabAttributes['grid'] {
  const entries = columns
    ?.filter((c) => c.width != null) // Only persist columns with a width defined
    .map(({ name, width }) => [name, { width }]);
  return { columns: Object.fromEntries(entries) };
}

export function fromStoredSort(
  sort: DiscoverSessionTabAttributes['sort']
): DiscoverSessionTab['sort'] {
  return sort.map((s) => {
    const [name, dir] = Array.isArray(s) ? s : [s, 'desc'];
    const direction = dir === 'asc' || dir === 'desc' ? dir : 'desc';
    return { name, direction };
  });
}

export function toStoredSort(
  sort: DiscoverSessionTab['sort'] = []
): DiscoverSessionTabAttributes['sort'] {
  return sort.map((s) => [s.name, s.direction]);
}

export function fromStoredDataset(
  index: SerializedSearchSourceFields['index']
): DiscoverSessionDataset {
  if (index == null) throw new Error('Data view is required to convert from stored dataset');
  if (typeof index === 'string') return { type: 'dataView', id: index };
  const title = index.title ?? index.id;
  if (title == null || title === '') {
    throw new Error('Stored index object must have a title or id to convert to dataset');
  }
  return {
    type: 'index',
    index: title,
    time_field: index.timeFieldName,
    runtime_fields: fromStoredRuntimeFields(index.runtimeFieldMap, index.fieldFormats),
  };
}

export function toStoredDataset(
  dataset: DiscoverSessionDataset
): SerializedSearchSourceFields['index'] {
  if (dataset.type === 'dataView') return dataset.id;
  const runtimeFieldMap = toStoredRuntimeFields(dataset.runtime_fields);
  const fieldFormats = toStoredFieldFormats(dataset.runtime_fields);
  return {
    title: dataset.index,
    timeFieldName: dataset.time_field,
    ...(runtimeFieldMap && Object.keys(runtimeFieldMap).length > 0 && { runtimeFieldMap }),
    ...(fieldFormats && Object.keys(fieldFormats).length > 0 && { fieldFormats }),
  };
}

export function fromStoredRuntimeFields(
  runtimeFields: DataViewSpec['runtimeFieldMap'] = {},
  fieldFormats: DataViewSpec['fieldFormats'] = {}
): DiscoverSessionDataViewSpec['runtime_fields'] {
  return Object.keys(runtimeFields).map((name) => ({
    type: runtimeFields?.[name].type,
    name,
    script: runtimeFields?.[name].script?.source,
    format: fieldFormats?.[name],
  }));
}

export function toStoredRuntimeFields(
  runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = []
): DataViewSpec['runtimeFieldMap'] {
  if (!runtimeFields || runtimeFields.length === 0) return {};
  return runtimeFields.reduce<DataViewSpec['runtimeFieldMap']>((acc, { name, type, script }) => {
    return {
      ...acc,
      [name]: {
        type,
        ...(script && { script: { source: script } }),
      },
    };
  }, {});
}

export function toStoredFieldFormats(
  runtimeFields: DiscoverSessionDataViewSpec['runtime_fields'] = []
): DataViewSpec['fieldFormats'] {
  if (!runtimeFields || runtimeFields.length === 0) return undefined;
  return runtimeFields.reduce<DataViewSpec['fieldFormats']>((acc, { name, format }) => {
    return {
      ...acc,
      ...(format ? { [name]: format } : {}),
    };
  }, {});
}
