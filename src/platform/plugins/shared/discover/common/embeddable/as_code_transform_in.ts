/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { SavedSearchType } from '@kbn/saved-search-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import { extractReferences } from '@kbn/data-plugin/common';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { DiscoverSessionEmbeddableByValueState } from '../../server/embeddable/schema';
import type { StoredSearchEmbeddableState } from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './get_transform_in';

interface AsCodeByRefState {
  discover_session_id: string;
  selected_tab_id?: string;
  title?: string;
  description?: string;
  hidePanelTitles?: boolean;
}

type AsCodeState = DiscoverSessionEmbeddableByValueState | AsCodeByRefState;

function isByRefState(state: AsCodeState): state is AsCodeByRefState {
  return 'discover_session_id' in state;
}

function convertColumnsToStored(columns?: Array<{ name: string; width?: number }>): {
  columns: string[];
  grid: { columns?: Record<string, { width?: number }> };
} {
  if (!columns || columns.length === 0) {
    return { columns: [], grid: {} };
  }

  const columnNames = columns.map((c) => c.name);
  const gridColumns: Record<string, { width?: number }> = {};
  for (const col of columns) {
    if (col.width !== undefined) {
      gridColumns[col.name] = { width: col.width };
    }
  }

  return {
    columns: columnNames,
    grid: Object.keys(gridColumns).length > 0 ? { columns: gridColumns } : {},
  };
}

function convertSortToStored(
  sort?: Array<{ name: string; direction: 'asc' | 'desc' }>
): Array<[string, string]> {
  if (!sort || sort.length === 0) {
    return [];
  }
  return sort.map((s) => [s.name, s.direction]);
}

interface AsCodeClassicTab {
  query?: { language: string; query: string };
  filters?: unknown[];
  dataset: { type: string; id?: string; index?: string; time_field?: string };
  columns?: Array<{ name: string; width?: number }>;
  sort?: Array<{ name: string; direction: 'asc' | 'desc' }>;
  view_mode?: string;
  density?: string;
  header_row_height?: number | 'auto';
  row_height?: number | 'auto';
  rows_per_page?: number;
  sample_size?: number;
}

function isClassicTab(tab: unknown): tab is AsCodeClassicTab {
  return typeof tab === 'object' && tab !== null && 'dataset' in tab;
}

function convertAsCodeTabToStored(tab: AsCodeClassicTab): {
  storedTabAttributes: Record<string, unknown>;
  references: SavedObjectReference[];
} {
  const storedFilters = toStoredFilters(tab.filters as Parameters<typeof toStoredFilters>[0]);
  const { columns, grid } = convertColumnsToStored(tab.columns);
  const sort = convertSortToStored(tab.sort);

  const searchSource: Record<string, unknown> = {};
  if (tab.query) {
    searchSource.query = tab.query;
  }
  if (storedFilters && storedFilters.length > 0) {
    searchSource.filter = storedFilters;
  }
  if (tab.dataset) {
    if (tab.dataset.type === 'dataView' && tab.dataset.id) {
      searchSource.index = tab.dataset.id;
    }
  }

  const [extractedState, searchSourceReferences] = extractReferences(searchSource);

  const storedTabAttributes: Record<string, unknown> = {
    columns,
    sort,
    grid,
    hideChart: false,
    isTextBasedQuery: false,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(extractedState),
    },
    ...(tab.view_mode !== undefined ? { viewMode: tab.view_mode } : {}),
    ...(tab.density !== undefined ? { density: tab.density } : {}),
    ...(tab.header_row_height !== undefined ? { headerRowHeight: tab.header_row_height } : {}),
    ...(tab.row_height !== undefined ? { rowHeight: tab.row_height } : {}),
    ...(tab.rows_per_page !== undefined ? { rowsPerPage: tab.rows_per_page } : {}),
    ...(tab.sample_size !== undefined ? { sampleSize: tab.sample_size } : {}),
  };

  if (tab.dataset?.type === 'index') {
    storedTabAttributes.usesAdHocDataView = true;
  }

  return { storedTabAttributes, references: searchSourceReferences };
}

interface AsCodeEsqlTab {
  query: { esql: string };
  columns?: Array<{ name: string; width?: number }>;
  sort?: Array<{ name: string; direction: 'asc' | 'desc' }>;
  view_mode?: string;
  density?: string;
  header_row_height?: number | 'auto';
  row_height?: number | 'auto';
}

function isEsqlTab(tab: unknown): tab is AsCodeEsqlTab {
  return (
    typeof tab === 'object' &&
    tab !== null &&
    'query' in tab &&
    typeof (tab as Record<string, unknown>).query === 'object' &&
    (tab as Record<string, unknown>).query !== null &&
    'esql' in ((tab as Record<string, unknown>).query as Record<string, unknown>)
  );
}

function convertEsqlTabToStored(tab: AsCodeEsqlTab): {
  storedTabAttributes: Record<string, unknown>;
  references: SavedObjectReference[];
} {
  const { columns, grid } = convertColumnsToStored(tab.columns);
  const sort = convertSortToStored(tab.sort as Array<{ name: string; direction: 'asc' | 'desc' }>);

  const storedTabAttributes: Record<string, unknown> = {
    columns,
    sort,
    grid,
    hideChart: false,
    isTextBasedQuery: true,
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({ query: tab.query }),
    },
    ...(tab.view_mode !== undefined ? { viewMode: tab.view_mode } : {}),
    ...(tab.density !== undefined ? { density: tab.density } : {}),
    ...(tab.header_row_height !== undefined ? { headerRowHeight: tab.header_row_height } : {}),
    ...(tab.row_height !== undefined ? { rowHeight: tab.row_height } : {}),
  };

  return { storedTabAttributes, references: [] };
}

export function getAsCodeTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']) {
  function transformIn(state: AsCodeState): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { state: processedState, references: drilldownReferences } = transformDrilldownsIn(
      state as AsCodeState & { drilldowns?: unknown[] }
    );

    if (isByRefState(processedState)) {
      const { discover_session_id: savedObjectId, selected_tab_id, ...rest } = processedState;
      return {
        state: {
          ...rest,
          ...(selected_tab_id !== undefined ? { selectedTabId: selected_tab_id } : {}),
        } as StoredSearchEmbeddableState,
        references: [
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: savedObjectId,
          },
          ...drilldownReferences,
        ],
      };
    }

    const byValueState = processedState as DiscoverSessionEmbeddableByValueState;
    const allTabReferences: SavedObjectReference[] = [];
    const storedTabs = (byValueState.tabs ?? []).map((tab) => {
      const tabId = uuidv4();

      let storedTabAttributes: Record<string, unknown> = {};
      let tabReferences: SavedObjectReference[] = [];

      if (isEsqlTab(tab)) {
        const result = convertEsqlTabToStored(tab as AsCodeEsqlTab);
        storedTabAttributes = result.storedTabAttributes;
        tabReferences = result.references;
      } else if (isClassicTab(tab)) {
        const result = convertAsCodeTabToStored(tab as AsCodeClassicTab);
        storedTabAttributes = result.storedTabAttributes;
        tabReferences = result.references;
      }

      allTabReferences.push(...tabReferences);

      return {
        id: tabId,
        label: byValueState.title ?? 'Untitled',
        attributes: storedTabAttributes,
      };
    });

    return {
      state: {
        ...(byValueState.title !== undefined ? { title: byValueState.title } : {}),
        ...(byValueState.description !== undefined
          ? { description: byValueState.description }
          : {}),
        attributes: {
          title: byValueState.title ?? '',
          description: byValueState.description ?? '',
          columns: [],
          sort: [],
          grid: {},
          hideChart: false,
          isTextBasedQuery: false,
          kibanaSavedObjectMeta: { searchSourceJSON: '{}' },
          tabs: storedTabs,
        },
      } as unknown as StoredSearchEmbeddableState,
      references: [...allTabReferences, ...drilldownReferences],
    };
  }

  return transformIn;
}
