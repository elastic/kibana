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
import type { SerializedDrilldowns } from '@kbn/embeddable-plugin/server';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { StoredSearchEmbeddableState } from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './get_transform_in';

function isByRefState(state: Record<string, unknown>): boolean {
  return typeof state.discover_session_id === 'string';
}

function isEsqlTab(tab: Record<string, unknown>): boolean {
  const query = tab.query as Record<string, unknown> | undefined;
  return typeof query === 'object' && query !== null && typeof query.esql === 'string';
}

function isClassicTab(tab: Record<string, unknown>): boolean {
  return typeof tab.dataset === 'object' && tab.dataset !== null;
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
  sort?: Array<{ name: string; direction: string }>
): Array<[string, string]> {
  if (!sort || sort.length === 0) {
    return [];
  }
  return sort.map((s) => [s.name, s.direction]);
}

function convertClassicTabToStored(tab: Record<string, unknown>): {
  storedTabAttributes: Record<string, unknown>;
  references: SavedObjectReference[];
} {
  const filters = tab.filters as unknown[] | undefined;
  const storedFilters = filters
    ? toStoredFilters(filters as Parameters<typeof toStoredFilters>[0])
    : undefined;
  const { columns, grid } = convertColumnsToStored(
    tab.columns as Array<{ name: string; width?: number }> | undefined
  );
  const sort = convertSortToStored(
    tab.sort as Array<{ name: string; direction: string }> | undefined
  );

  const dataset = tab.dataset as { type: string; id?: string; index?: string } | undefined;
  const query = tab.query as { language: string; query: string } | undefined;

  const searchSource: Record<string, unknown> = {};
  if (query) {
    searchSource.query = query;
  }
  if (storedFilters && storedFilters.length > 0) {
    searchSource.filter = storedFilters;
  }
  if (dataset?.type === 'dataView' && dataset.id) {
    searchSource.index = dataset.id;
  }

  let searchSourceReferences: SavedObjectReference[] = [];
  let extractedState: Record<string, unknown> = searchSource;
  try {
    const [extracted, refs] = extractReferences(searchSource);
    extractedState = extracted;
    searchSourceReferences = refs;
  } catch {
    // Fall back to un-extracted searchSource
  }

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

  if (dataset?.type === 'index') {
    storedTabAttributes.usesAdHocDataView = true;
  }

  return { storedTabAttributes, references: searchSourceReferences };
}

function convertEsqlTabToStored(tab: Record<string, unknown>): {
  storedTabAttributes: Record<string, unknown>;
  references: SavedObjectReference[];
} {
  const { columns, grid } = convertColumnsToStored(
    tab.columns as Array<{ name: string; width?: number }> | undefined
  );
  const sort = convertSortToStored(
    tab.sort as Array<{ name: string; direction: string }> | undefined
  );

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
  return function transformIn(state: object): {
    state: StoredSearchEmbeddableState;
    references: SavedObjectReference[];
  } {
    const { state: processedState, references: drilldownReferences } = transformDrilldownsIn(
      state as SerializedDrilldowns
    );

    const record = processedState as Record<string, unknown>;

    if (isByRefState(record)) {
      const { discover_session_id, selected_tab_id, ...rest } = record;
      return {
        state: {
          ...rest,
          ...(selected_tab_id !== undefined ? { selectedTabId: selected_tab_id } : {}),
        } as StoredSearchEmbeddableState,
        references: [
          {
            name: SAVED_SEARCH_SAVED_OBJECT_REF_NAME,
            type: SavedSearchType,
            id: discover_session_id as string,
          },
          ...drilldownReferences,
        ],
      };
    }

    const tabs = record.tabs as Array<Record<string, unknown>> | undefined;
    const allTabReferences: SavedObjectReference[] = [];
    const storedTabs = (tabs ?? []).map((tab) => {
      const tabId = uuidv4();

      let result: {
        storedTabAttributes: Record<string, unknown>;
        references: SavedObjectReference[];
      };
      if (isEsqlTab(tab)) {
        result = convertEsqlTabToStored(tab);
      } else if (isClassicTab(tab)) {
        result = convertClassicTabToStored(tab);
      } else {
        result = { storedTabAttributes: {}, references: [] };
      }

      allTabReferences.push(...result.references);

      return {
        id: tabId,
        label: (record.title as string) ?? 'Untitled',
        attributes: result.storedTabAttributes,
      };
    });

    const title = (record.title as string) ?? '';
    const description = (record.description as string) ?? '';

    return {
      state: {
        ...(record.title !== undefined ? { title } : {}),
        ...(record.description !== undefined ? { description } : {}),
        attributes: {
          title,
          description,
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
  };
}
