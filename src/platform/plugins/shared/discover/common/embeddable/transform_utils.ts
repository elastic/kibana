/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { SavedSearchAttributes } from '@kbn/saved-search-plugin/common';
import { extractTabs, SavedSearchType, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DataViewSpec, SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import {
  extractReferences,
  injectReferences,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import { fromStoredFilters, toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { SavedObjectReference } from '@kbn/core-saved-objects-common/src/server_types';
import { DataGridDensity } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
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
  storedState: StoredSearchEmbeddableState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableState {
  return isByReferenceSavedSearchEmbeddableState(storedState)
    ? byReferenceSavedSearchToDiscoverSessionEmbeddableState(storedState, references)
    : byValueSavedSearchToDiscoverSessionEmbeddableState(storedState, references);
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
  storedState: StoredSearchEmbeddableByReferenceState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableByReferenceState {
  const savedObjectRef = references.find(
    (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
  );
  if (!savedObjectRef) throw new Error(`Missing reference of type "${SavedSearchType}"`);
  const {
    sort,
    columns,
    rowHeight,
    sampleSize,
    rowsPerPage,
    headerRowHeight,
    density,
    grid,
    ...otherAttrs
  } = storedState;
  return {
    ...otherAttrs,
    ...(sort && { sort: fromStoredSort(sort) }),
    ...(columns && { columns: fromStoredColumns(columns, grid) }),
    ...(rowHeight && { row_height: fromStoredHeight(rowHeight) }),
    ...(sampleSize && { sample_size: sampleSize }),
    ...(rowsPerPage && {
      rows_per_page: rowsPerPage as DiscoverSessionEmbeddableState['rows_per_page'],
    }),
    ...(headerRowHeight && { header_row_height: fromStoredHeight(headerRowHeight) }),
    ...(density && { density }),
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
  const {
    sort,
    columns,
    row_height: rowHeight,
    sample_size: sampleSize,
    rows_per_page: rowsPerPage,
    header_row_height: headerRowHeight,
    density,
    discover_session_id,
    selected_tab_id,
    ...otherAttrs
  } = apiState;
  const state: StoredSearchEmbeddableByReferenceState = {
    ...otherAttrs,
    ...(sort && { sort: toStoredSort(sort) }),
    ...(columns && { columns: toStoredColumns(columns) }),
    ...(rowHeight && { rowHeight: toStoredHeight(rowHeight) }),
    ...(sampleSize && { sampleSize }),
    ...(rowsPerPage && { rowsPerPage }),
    ...(headerRowHeight && { headerRowHeight: toStoredHeight(headerRowHeight) }),
    ...(density && { density }),
    grid: toStoredGrid(columns),
  };
  return {
    state,
    references: [...references, discoverSessionReference],
  };
}

export function byValueSavedSearchToDiscoverSessionEmbeddableState(
  storedState: StoredSearchEmbeddableByValueState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableByValueState {
  const {
    sort,
    columns,
    rowHeight,
    sampleSize,
    rowsPerPage,
    headerRowHeight,
    density,
    grid,
    attributes,
    ...otherAttrs
  } = storedState;
  const [tab] = attributes.tabs ?? extractTabs(attributes).tabs;
  const apiTab = fromStoredTab(tab.attributes, references);
  return {
    ...otherAttrs,
    ...(sort && { sort: fromStoredSort(sort) }),
    ...(columns && { columns: fromStoredColumns(columns, grid) }),
    ...(rowHeight && { row_height: fromStoredHeight(rowHeight) }),
    ...(sampleSize && { sample_size: sampleSize }),
    ...(rowsPerPage && {
      rows_per_page: rowsPerPage as DiscoverSessionEmbeddableState['rows_per_page'],
    }),
    ...(headerRowHeight && { header_row_height: fromStoredHeight(headerRowHeight) }),
    ...(density && { density }),
    tabs: [apiTab],
  };
}

export function byValueDiscoverSessionToSavedSearchEmbeddableState(
  apiState: DiscoverSessionEmbeddableByValueState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableByValueState; references: SavedObjectReference[] } {
  const {
    sort,
    columns,
    row_height: rowHeight,
    sample_size: sampleSize,
    rows_per_page: rowsPerPage,
    header_row_height: headerRowHeight,
    density,
    tabs: [apiTab],
    ...otherAttrs
  } = apiState;
  const { state: tabAttributes, references: tabReferences } = toStoredTab(apiTab);
  const state: StoredSearchEmbeddableByValueState = {
    ...otherAttrs,
    ...(sort && { sort: toStoredSort(sort) }),
    ...(columns && { columns: toStoredColumns(columns) }),
    ...(rowHeight && { rowHeight: toStoredHeight(rowHeight) }),
    ...(sampleSize && { sampleSize }),
    ...(rowsPerPage && { rowsPerPage }),
    ...(headerRowHeight && { headerRowHeight: toStoredHeight(headerRowHeight) }),
    ...(density && { density }),
    grid: toStoredGrid(columns),
    attributes: {
      ...tabAttributes,
      sort: tabAttributes.sort as SavedSearchAttributes['sort'],
      title: apiState.title ?? '', // Only necessary for schema validation
      description: apiState.description ?? '', // Only necessary for schema validation
      tabs: [
        {
          id: '', // Only necessary for schema validation
          label: '', // Only necessary for schema validation
          attributes: tabAttributes,
        },
      ],
    },
  };
  return {
    state,
    references: [...references, ...tabReferences],
  };
}

export function fromStoredTab(
  tab: DiscoverSessionTabAttributes,
  references: SavedObjectReference[] = []
): DiscoverSessionTab {
  const {
    sort,
    columns,
    rowHeight,
    sampleSize,
    rowsPerPage,
    headerRowHeight,
    density,
    grid,
    viewMode,
    kibanaSavedObjectMeta: { searchSourceJSON },
  } = tab;
  const apiTab = {
    sort: fromStoredSort(sort),
    ...(columns && { columns: fromStoredColumns(columns, grid) }),
    ...(rowHeight && { row_height: fromStoredHeight(rowHeight) }),
    header_row_height: fromStoredHeight(headerRowHeight)!,
    density: density ?? DataGridDensity.COMPACT,
  };
  const searchSourceValues = parseSearchSourceJSON(searchSourceJSON);
  const { index, query, filter } = injectReferences(searchSourceValues, references);
  return isOfAggregateQueryType(query)
    ? { ...apiTab, query }
    : {
        ...apiTab,
        ...(sampleSize && { sample_size: sampleSize }),
        ...(rowsPerPage && {
          rows_per_page: rowsPerPage as DiscoverSessionClassicTab['rows_per_page'],
        }),
        query,
        filters: fromStoredFilters(filter) ?? [],
        dataset: fromStoredDataset(index),
        view_mode: viewMode ?? VIEW_MODE.DOCUMENT_LEVEL,
      };
}

export function toStoredTab(apiTab: DiscoverSessionTab): {
  state: DiscoverSessionTabAttributes;
  references: SavedObjectReference[];
} {
  const {
    sort,
    columns,
    row_height: rowHeight,
    header_row_height: headerRowHeight,
    density,
  } = apiTab;
  const searchSourceValues: SerializedSearchSourceFields = {
    query: apiTab.query,
    ...('filters' in apiTab && { filter: toStoredFilters(apiTab.filters) }),
    ...('dataset' in apiTab && { index: toStoredDataset(apiTab.dataset) }),
  };
  const [searchSourceFields, references] = extractReferences(searchSourceValues);
  const state: DiscoverSessionTabAttributes = {
    sort: toStoredSort(sort),
    columns: toStoredColumns(columns),
    ...(rowHeight && { rowHeight: toStoredHeight(rowHeight) }),
    ...(headerRowHeight && { headerRowHeight: toStoredHeight(headerRowHeight) }),
    ...(density && { density }),
    grid: toStoredGrid(columns),
    hideChart: false,
    isTextBasedQuery: !('dataset' in apiTab),
    kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSourceFields) },
  };
  return { state, references };
}

export function fromStoredColumns(
  columns: DiscoverSessionTabAttributes['columns'],
  grid?: DiscoverSessionTabAttributes['grid']
): DiscoverSessionTab['columns'] {
  return columns.map((name) => ({
    name,
    ...(grid?.columns?.[name] && { width: grid.columns[name]?.width }),
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
): DiscoverSessionTabAttributes['sort'] & SavedSearchAttributes['sort'] {
  return sort.map((s) => [s.name, s.direction]);
}

export function fromStoredHeight<
  T extends DiscoverSessionTab['row_height'] | DiscoverSessionTab['header_row_height']
>(height: number = 3): T {
  return (height === -1 ? 'auto' : height) as T;
}

export function toStoredHeight(
  height: DiscoverSessionTab['row_height'] | DiscoverSessionTab['header_row_height']
): number {
  return typeof height === 'number' ? height : -1; // -1 === 'auto'
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
