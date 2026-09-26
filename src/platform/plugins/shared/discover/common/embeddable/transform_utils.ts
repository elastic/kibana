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
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import {
  extractReferences,
  injectReferences,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import { fromStoredFilters, toStoredFilters } from '@kbn/as-code-filters-transforms';
import { AS_CODE_ESQL_DATA_SOURCE_TYPE } from '@kbn/as-code-data-views-schema';
import { fromStoredDataView, toStoredDataView } from '@kbn/as-code-data-views-transforms';
import { toAsCodeQuery, toStoredQuery } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import { isLegacySort, type SortOrder } from '@kbn/discover-utils';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import type {
  DiscoverSessionApiMetricsTabTypeState,
  DiscoverSessionApiEmbeddableOverrides,
  DiscoverSessionApiEmbeddableTab,
  DiscoverSessionApiTabBase,
} from '@kbn/as-code-discover-schema';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { JsonModeSettings } from '@kbn/unified-data-table';
import {
  isDiscoverSessionEmbeddableByReferenceState,
  isDiscoverSessionEsqlTab,
  isSearchEmbeddableByValueState,
} from './type_guards';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
  DiscoverSessionEmbeddableState,
  SearchEmbeddableByReferenceState,
  SearchEmbeddableState,
  StoredSearchEmbeddableByReferenceState,
  StoredSearchEmbeddableByValueState,
  StoredSearchEmbeddableState,
} from './types';
import {
  DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_ID,
  DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_LABEL,
  SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
} from './constants';

export function fromStoredSearchEmbeddable(
  storedState: SearchEmbeddableState | StoredSearchEmbeddableState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableState {
  return isSearchEmbeddableByValueState(storedState)
    ? fromStoredSearchEmbeddableByValue(storedState, [
        ...references,
        ...(storedState.attributes.references ?? []),
      ])
    : fromStoredSearchEmbeddableByRef(storedState, references);
}

export function toStoredSearchEmbeddable(
  apiState: DiscoverSessionEmbeddableState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableState; references: SavedObjectReference[] } {
  return isDiscoverSessionEmbeddableByReferenceState(apiState)
    ? toStoredSearchEmbeddableByRef(apiState, references)
    : toStoredSearchEmbeddableByValue(apiState, references);
}

export function fromStoredSearchEmbeddableByRef(
  storedState: SearchEmbeddableByReferenceState | StoredSearchEmbeddableByReferenceState,
  references: SavedObjectReference[] = []
): DiscoverSessionEmbeddableByReferenceState {
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
    gridImplementation,
    grid,
    selectedTabId,
    savedObjectId,
    ...otherAttrs
  } = {
    ...storedState,
    savedObjectId:
      references.find(
        (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
      )?.id ??
      ('savedObjectId' in storedState && storedState.savedObjectId),
  };
  if (!savedObjectId) throw new Error(`Missing reference of type "${SavedSearchType}"`);
  return {
    ...otherAttrs,
    ref_id: savedObjectId,
    selected_tab_id: selectedTabId,
    overrides: toDiscoverSessionEmbeddableOverrides(storedState),
  };
}

export function toStoredSearchEmbeddableByRef(
  apiState: DiscoverSessionEmbeddableByReferenceState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableByReferenceState; references: SavedObjectReference[] } {
  const discoverSessionReference: SavedObjectReference = {
    name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
    type: SavedSearchType,
    id: apiState.ref_id,
  };
  const { ref_id, selected_tab_id, overrides, ...otherAttrs } = apiState;
  const state: StoredSearchEmbeddableByReferenceState = {
    ...otherAttrs,
    ...fromDiscoverSessionEmbeddableOverrides(overrides ?? {}),
    ...(selected_tab_id != null && { selectedTabId: selected_tab_id }),
  };
  return {
    state,
    references: [...references, discoverSessionReference],
  };
}

export function fromStoredSearchEmbeddableByValue(
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
    documentsDisplayMode,
    jsonModeSettings,
    gridImplementation,
    grid,
    attributes,
    title,
    description,
    ...otherAttrs
  } = storedState;
  const [tab] = attributes.tabs ?? extractTabs(attributes).tabs;
  const apiTab = fromStoredTab(tab.attributes, references);
  // Saved Metrics settings only apply to an ES|QL tab; a mismatch is dropped rather than failing
  // the panel, unlike the session API which rejects the session outright.
  const typedTab: DiscoverSessionApiEmbeddableTab =
    tab.attributes.tabTypeState && isDiscoverSessionEsqlTab(apiTab)
      ? { ...apiTab, ...fromStoredMetricsTabTypeState(tab.attributes.tabTypeState) }
      : { ...apiTab, type: DiscoverTabType.Default };
  const embeddableOverrides = toDiscoverSessionEmbeddableOverrides(storedState);
  const { hide_title, hide_border } = storedState;

  return {
    ...otherAttrs,
    title: title || attributes.title,
    description: description || attributes.description,
    ...(hide_title && { hide_title }),
    ...(hide_border && { hide_border }),
    tabs: [{ ...typedTab, ...embeddableOverrides }],
  };
}

export function toStoredSearchEmbeddableByValue(
  apiState: DiscoverSessionEmbeddableByValueState,
  references: SavedObjectReference[] = []
): { state: StoredSearchEmbeddableByValueState; references: SavedObjectReference[] } {
  const {
    tabs: [apiTab],
    ...otherAttrs
  } = apiState;
  const { state: tabAttributes, references: tabReferences } = toStoredTab(apiTab);
  const state: StoredSearchEmbeddableByValueState = {
    ...otherAttrs,
    ...fromDiscoverSessionEmbeddableOverrides(apiTab),
    attributes: {
      ...tabAttributes,
      sort: tabAttributes.sort as SavedSearchAttributes['sort'],
      title: apiState.title ?? '',
      description: apiState.description ?? '',
      tabs: [
        {
          id: DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_ID,
          label: DISCOVER_SESSION_EMBEDDABLE_SYNTHETIC_TAB_LABEL,
          attributes: {
            ...tabAttributes,
            ...(apiTab.type === DiscoverTabType.Metrics && {
              tabTypeState: toStoredMetricsTabTypeState(
                apiTab as DiscoverSessionApiMetricsTabTypeState
              ),
            }),
          },
        },
      ],
    },
  };
  return {
    state,
    references: [...references, ...tabReferences],
  };
}

export const fromStoredMetricsTabTypeState = (
  tabTypeState: NonNullable<DiscoverSessionTabAttributes['tabTypeState']>
): DiscoverSessionApiMetricsTabTypeState => ({
  type: DiscoverTabType.Metrics,
  dimensions: tabTypeState.dimensions,
  search_term: tabTypeState.searchTerm,
  counter_aggregation: tabTypeState.counterAggregation,
  gauge_aggregation: tabTypeState.gaugeAggregation,
  histogram_percentile: tabTypeState.histogramPercentile,
});

export const toStoredMetricsTabTypeState = (
  tabTypeState: DiscoverSessionApiMetricsTabTypeState
): NonNullable<DiscoverSessionTabAttributes['tabTypeState']> => ({
  type: DiscoverTabType.Metrics,
  dimensions: tabTypeState.dimensions,
  searchTerm: tabTypeState.search_term,
  counterAggregation: tabTypeState.counter_aggregation,
  gaugeAggregation: tabTypeState.gauge_aggregation,
  histogramPercentile: tabTypeState.histogram_percentile,
});

export function fromStoredTab(
  tab: DiscoverSessionTabAttributes,
  references: SavedObjectReference[] = []
): DiscoverSessionApiTabBase {
  const {
    kibanaSavedObjectMeta: { searchSourceJSON },
  } = tab;
  const searchSource = injectReferences(parseSearchSourceJSON(searchSourceJSON), references);

  return fromStoredTabWithSearchSource(tab, searchSource);
}

/** Maps a stored tab using the SearchSource prepared by the caller. */
export function fromStoredTabWithSearchSource(
  tab: DiscoverSessionTabAttributes,
  { index, query, filter }: SerializedSearchSourceFields
): DiscoverSessionApiTabBase {
  const { sort, sampleSize, rowsPerPage, viewMode } = tab;
  const apiTab = {
    ...toDiscoverSessionEmbeddableOverrides(tab),
    sort: fromStoredSort(sort),
  };

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
}

export function toStoredTab(
  apiTab: DiscoverSessionApiTabBase,
  options?: { refNamePrefix?: string }
): {
  state: DiscoverSessionTabAttributes;
  references: SavedObjectReference[];
} {
  const { sort, column_order: columnOrder, column_settings: columnSettings } = apiTab;
  const storedQuery = isDiscoverSessionEsqlTab(apiTab)
    ? { esql: apiTab.data_source.query }
    : toStoredQuery(apiTab.query);
  const searchSourceValues: SerializedSearchSourceFields = {
    ...(storedQuery && { query: storedQuery }),
    ...('filters' in apiTab && { filter: toStoredFilters(apiTab.filters) }),
    ...(!isDiscoverSessionEsqlTab(apiTab) && { index: toStoredDataView(apiTab.data_source) }),
  };
  const [searchSourceFields, references] = extractReferences(searchSourceValues, options);
  const state: DiscoverSessionTabAttributes = {
    ...fromDiscoverSessionEmbeddableOverrides(apiTab),
    sort: toStoredSort(sort),
    columns: columnOrder ?? [],
    grid: toStoredGrid(columnSettings),
    hideChart: false,
    hideTable: false,
    isTextBasedQuery: isDiscoverSessionEsqlTab(apiTab),
    kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSourceFields) },
    ...('view_mode' in apiTab && { viewMode: apiTab.view_mode }),
  };
  return { state, references };
}

export function toDiscoverSessionEmbeddableOverrides(
  storedState: StoredSearchEmbeddableState | DiscoverSessionTabAttributes
): DiscoverSessionApiEmbeddableOverrides {
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
    gridImplementation,
  } = storedState;
  return {
    ...(sort && { sort: fromStoredSort(sort) }),
    ...(columns && { column_order: columns }),
    ...(grid &&
      Object.keys(grid?.columns ?? {}).length && { column_settings: fromStoredGrid(grid) }),
    ...(rowHeight && { row_height: fromStoredRowHeight(rowHeight) }),
    ...(sampleSize && { sample_size: sampleSize }),
    ...(rowsPerPage && { rows_per_page: rowsPerPage }),
    ...(headerRowHeight && { header_row_height: fromStoredRowHeight(headerRowHeight) }),
    ...(density && { density }),
    ...(documentsDisplayMode && { documents_display_mode: documentsDisplayMode }),
    ...(gridImplementation && { grid_implementation: gridImplementation }),
    ...fromStoredJsonModeSettings(jsonModeSettings),
  };
}

export function fromDiscoverSessionEmbeddableOverrides(
  apiState: DiscoverSessionApiEmbeddableOverrides
): StoredSearchEmbeddableState {
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
    grid_implementation: gridImplementation,
  } = apiState;
  const jsonModeSettings = toStoredJsonModeSettings(apiState);
  return {
    ...(sort && { sort: toStoredSort(sort) }),
    ...(columnOrder && { columns: columnOrder }),
    ...(rowHeight && { rowHeight: toStoredHeight(rowHeight) }),
    ...(sampleSize && { sampleSize }),
    ...(rowsPerPage && { rowsPerPage }),
    ...(headerRowHeight && { headerRowHeight: toStoredHeight(headerRowHeight) }),
    ...(density && { density }),
    ...(documentsDisplayMode && { documentsDisplayMode }),
    ...(gridImplementation && { gridImplementation }),
    ...(jsonModeSettings && { jsonModeSettings }),
    ...(Object.keys(columnSettings ?? {}).length && { grid: toStoredGrid(columnSettings) }),
  };
}

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

export function fromStoredGrid(
  grid: DiscoverSessionTabAttributes['grid']
): DiscoverSessionApiTabBase['column_settings'] {
  return grid.columns ?? {};
}

export function toStoredGrid(
  columnSettings: DiscoverSessionApiTabBase['column_settings'] = {}
): DiscoverSessionTabAttributes['grid'] {
  return Object.keys(columnSettings).length > 0 ? { columns: columnSettings } : {};
}

export function fromStoredSort(
  sort: DiscoverSessionTabAttributes['sort']
): DiscoverSessionApiTabBase['sort'] {
  const sortInput = sort as SortOrder | SortOrder[];
  const normalizedSort: SortOrder[] = isLegacySort(sortInput) ? [sortInput] : sortInput;

  return normalizedSort.map((s) => {
    const [name, dir] = Array.isArray(s) ? s : [s, 'desc'];
    const direction = dir === 'asc' || dir === 'desc' ? dir : 'desc';
    return { name, direction };
  });
}

export function toStoredSort(
  sort: DiscoverSessionApiTabBase['sort'] = []
): DiscoverSessionTabAttributes['sort'] & SavedSearchAttributes['sort'] {
  return sort.map((s) => [s.name, s.direction]);
}

export function fromStoredRowHeight(height: number) {
  return height === -1 ? 'auto' : height;
}

export function toStoredHeight(
  height: DiscoverSessionApiTabBase['row_height'] | DiscoverSessionApiTabBase['header_row_height']
): number {
  return typeof height === 'number' ? height : -1; // -1 === 'auto'
}
