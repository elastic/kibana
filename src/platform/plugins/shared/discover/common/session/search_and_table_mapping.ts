/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import type {
  DiscoverSessionApiEmbeddableOverrides,
  DiscoverSessionApiTabBase,
} from '@kbn/as-code-discover-schema';
import { fromStoredDataView, toStoredDataView } from '@kbn/as-code-data-views-transforms';
import { fromStoredFilters, toStoredFilters } from '@kbn/as-code-filters-transforms';
import { toAsCodeQuery, toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import { extractReferences, type SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isLegacySort, type SortOrder } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { DiscoverSessionTabAttributes } from '@kbn/saved-search-plugin/server';
import type { JsonModeSettings } from '@kbn/unified-data-table';
import { isDiscoverSessionEsqlTab } from './type_guards';

// "Stored" names the saved tab format, not a persistence step:
// `toStored…` maps API fields to that format and `fromStored…` maps it back.

/** Fields are optional because panels can override only some table settings. */
type StoredTableSettings = Partial<
  Pick<
    DiscoverSessionTabAttributes,
    | 'columns'
    | 'grid'
    | 'rowHeight'
    | 'headerRowHeight'
    | 'sampleSize'
    | 'rowsPerPage'
    | 'density'
    | 'documentsDisplayMode'
    | 'jsonModeSettings'
  >
> & { sort?: StoredSort };

/** Search and table state of a complete stored tab, including the defaults a tab needs. */
interface StoredSearchAndTable extends StoredTableSettings {
  sort: StoredSort;
  columns: string[];
  grid: DiscoverSessionTabAttributes['grid'];
  isTextBasedQuery: boolean;
  viewMode?: DiscoverSessionTabAttributes['viewMode'];
  serializedSearchSource: SerializedSearchSourceFields;
}

type StoredSort = DiscoverSessionTabAttributes['sort'] & DiscoverSessionTab['sort'];

/** Converts an API tab to complete search and table state, keeping the SearchSource an object. */
export const toStoredSearchAndTable = (apiTab: DiscoverSessionApiTabBase): StoredSearchAndTable => {
  const serializedSearchSource = toStoredSearchSource(apiTab);
  const tableSettings = toStoredTableSettings(apiTab);
  return {
    ...tableSettings,
    sort: tableSettings.sort ?? [],
    columns: tableSettings.columns ?? [],
    grid: tableSettings.grid ?? {},
    isTextBasedQuery: isDiscoverSessionEsqlTab(apiTab),
    serializedSearchSource,
    ...('view_mode' in apiTab && { viewMode: apiTab.view_mode }),
  };
};

/** Stored search and table fields, with the SearchSource serialized and its references extracted. */
type StoredSearchAndTableAttributes = Omit<StoredSearchAndTable, 'serializedSearchSource'> &
  Pick<DiscoverSessionTabAttributes, 'kibanaSavedObjectMeta'>;

/** Converts an API tab to stored search and table fields, extracting SearchSource references. */
export const toStoredSearchAndTableAttributes = (
  apiTab: DiscoverSessionApiTabBase,
  options?: { refNamePrefix?: string }
): { attributes: StoredSearchAndTableAttributes; references: SavedObjectReference[] } => {
  const { serializedSearchSource, ...tableFields } = toStoredSearchAndTable(apiTab);
  const [searchSourceFields, references] = extractReferences(serializedSearchSource, options);
  return {
    attributes: {
      ...tableFields,
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSourceFields) },
    },
    references,
  };
};

/** Converts only an API tab's query, filters, and Data View, leaving references inline. */
export const toStoredSearchSource = (
  apiTab: DiscoverSessionApiTabBase
): SerializedSearchSourceFields => {
  const query = isDiscoverSessionEsqlTab(apiTab)
    ? { esql: apiTab.data_source.query }
    : toStoredQuery(apiTab.query);
  return {
    ...(query && { query }),
    ...('filters' in apiTab && { filter: toStoredFilters(apiTab.filters) }),
    ...(!isDiscoverSessionEsqlTab(apiTab) && { index: toStoredDataView(apiTab.data_source) }),
  };
};

/** Converts search and table state to API fields without applying session-specific policies. */
export const fromStoredSearchAndTable = (
  tab: DiscoverSessionTab | DiscoverSessionTabAttributes,
  searchSource: SerializedSearchSourceFields
): DiscoverSessionApiTabBase => {
  const { sort, sampleSize, rowsPerPage, viewMode } = tab;
  const apiTab = {
    ...fromStoredTableSettings(tab),
    sort: fromStoredSort(sort),
  };
  const { index, query, filter } = searchSource;
  return isOfAggregateQueryType(query)
    ? {
        ...apiTab,
        data_source: {
          type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
          query: query.esql,
        },
      }
    : {
        ...apiTab,
        ...(sampleSize && { sample_size: sampleSize }),
        ...(rowsPerPage && { rows_per_page: rowsPerPage }),
        ...(query && { query: toAsCodeQuery(query) }),
        filters: fromStoredFilters(filter) ?? [],
        data_source: fromStoredDataView(index),
        view_mode: viewMode ?? VIEW_MODE.DOCUMENT_LEVEL,
      };
};

/** Converts the stored table settings that are set to API fields, without adding defaults. */
export const fromStoredTableSettings = (
  storedState: Partial<DiscoverSessionTabAttributes>
): DiscoverSessionApiEmbeddableOverrides => {
  const {
    sort,
    columns,
    rowHeight,
    sampleSize,
    rowsPerPage,
    headerRowHeight,
    density,
    documentsDisplayMode,
    jsonModeSettings,
    grid,
  } = storedState;
  return {
    ...(sort && { sort: fromStoredSort(sort) }),
    ...(columns && { column_order: columns }),
    ...(grid?.columns && Object.keys(grid.columns).length > 0 && { column_settings: grid.columns }),
    ...(rowHeight && { row_height: fromStoredRowHeight(rowHeight) }),
    ...(sampleSize && { sample_size: sampleSize }),
    ...(rowsPerPage && { rows_per_page: rowsPerPage }),
    ...(headerRowHeight && { header_row_height: fromStoredRowHeight(headerRowHeight) }),
    ...(density && { density }),
    ...(documentsDisplayMode && { documents_display_mode: documentsDisplayMode }),
    ...fromStoredJsonModeSettings(jsonModeSettings),
  };
};

/** Converts the API table fields that are set to stored settings, without adding defaults. */
export const toStoredTableSettings = (
  apiState: DiscoverSessionApiEmbeddableOverrides
): StoredTableSettings => {
  const {
    sort,
    column_order: columnOrder,
    column_settings: columnSettings,
    row_height: rowHeight,
    sample_size: sampleSize,
    rows_per_page: rowsPerPage,
    header_row_height: headerRowHeight,
    density,
    documents_display_mode: documentsDisplayMode,
  } = apiState;
  const jsonModeSettings = toStoredJsonModeSettings(apiState);
  return {
    ...(sort && { sort: toStoredSort(sort) }),
    ...(columnOrder && { columns: columnOrder }),
    ...(rowHeight && { rowHeight: toStoredRowHeight(rowHeight) }),
    ...(sampleSize && { sampleSize }),
    ...(rowsPerPage && { rowsPerPage }),
    ...(headerRowHeight && { headerRowHeight: toStoredRowHeight(headerRowHeight) }),
    ...(density && { density }),
    ...(documentsDisplayMode && { documentsDisplayMode }),
    ...(jsonModeSettings && { jsonModeSettings }),
    ...(columnSettings &&
      Object.keys(columnSettings).length > 0 && { grid: { columns: columnSettings } }),
  };
};

const fromStoredJsonModeSettings = (
  jsonModeSettings?: JsonModeSettings
): Pick<
  DiscoverSessionApiEmbeddableOverrides,
  'hide_nulls' | 'wrap_lines' | 'default_rendered_nodes'
> => {
  if (!jsonModeSettings) {
    return {};
  }
  return {
    ...(jsonModeSettings.hideNulls !== undefined && { hide_nulls: jsonModeSettings.hideNulls }),
    ...(jsonModeSettings.wrapLines !== undefined && { wrap_lines: jsonModeSettings.wrapLines }),
    ...(jsonModeSettings.defaultRenderedNodes !== undefined && {
      default_rendered_nodes: jsonModeSettings.defaultRenderedNodes,
    }),
  };
};

const toStoredJsonModeSettings = (
  apiState: DiscoverSessionApiEmbeddableOverrides
): JsonModeSettings | undefined => {
  const jsonModeSettings: JsonModeSettings = {
    ...(apiState.hide_nulls !== undefined && { hideNulls: apiState.hide_nulls }),
    ...(apiState.wrap_lines !== undefined && { wrapLines: apiState.wrap_lines }),
    ...(apiState.default_rendered_nodes !== undefined && {
      defaultRenderedNodes: apiState.default_rendered_nodes,
    }),
  };
  return Object.keys(jsonModeSettings).length > 0 ? jsonModeSettings : undefined;
};

/** Converts stored sort pairs, including the legacy single pair, to API sort objects. */
const fromStoredSort = (
  sort: DiscoverSessionTabAttributes['sort']
): DiscoverSessionApiTabBase['sort'] => {
  const sortInput = sort as SortOrder | SortOrder[];
  const normalizedSort: SortOrder[] = isLegacySort(sortInput) ? [sortInput] : sortInput;

  return normalizedSort.map((s) => {
    const [name, dir] = Array.isArray(s) ? s : [s, 'desc'];
    const direction = dir === 'asc' || dir === 'desc' ? dir : 'desc';
    return { name, direction };
  });
};

/** Converts API sort objects to stored sort pairs. */
const toStoredSort = (sort: DiscoverSessionApiTabBase['sort']): StoredSort =>
  sort.map((s) => [s.name, s.direction]);

/** Converts a stored row height to the API form, where `-1` means `auto`. */
const fromStoredRowHeight = (height: number): number | 'auto' => (height === -1 ? 'auto' : height);

/** Converts an API row height to the stored form, where `auto` becomes `-1`. */
const toStoredRowHeight = (
  height: DiscoverSessionApiTabBase['row_height'] | DiscoverSessionApiTabBase['header_row_height']
): number => (typeof height === 'number' ? height : -1);
