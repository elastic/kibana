/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { extractTabs, SavedSearchType } from '@kbn/saved-search-plugin/common';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import { fromStoredFilters } from '@kbn/as-code-filters-transforms';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { SavedObjectReference } from '@kbn/core/server';
import { transformTimeRangeOut, transformTitlesOut } from '@kbn/presentation-publishing';
import type { StoredSearchEmbeddableByValueState, StoredSearchEmbeddableState } from './types';
import { SAVED_SEARCH_SAVED_OBJECT_REF_NAME } from './get_transform_in';

function isByValue(
  state: StoredSearchEmbeddableState
): state is StoredSearchEmbeddableByValueState {
  return (
    typeof (state as StoredSearchEmbeddableByValueState).attributes === 'object' &&
    (state as StoredSearchEmbeddableByValueState).attributes !== null
  );
}

function convertStoredColumnsToAsCode(
  columns?: string[],
  grid?: { columns?: Record<string, { width?: number }> }
): Array<{ name: string; width?: number }> | undefined {
  if (!columns || columns.length === 0) {
    return undefined;
  }
  return columns.map((name) => {
    const width = grid?.columns?.[name]?.width;
    return width !== undefined ? { name, width } : { name };
  });
}

function convertStoredSortToAsCode(
  sort?: Array<string[] | string>
): Array<{ name: string; direction: 'asc' | 'desc' }> | undefined {
  if (!sort || sort.length === 0) {
    return undefined;
  }
  return sort
    .map((s) => {
      if (Array.isArray(s) && s.length >= 2) {
        return { name: s[0], direction: s[1] as 'asc' | 'desc' };
      }
      return undefined;
    })
    .filter((s): s is { name: string; direction: 'asc' | 'desc' } => s !== undefined);
}

interface StoredTabAttributes {
  columns?: string[];
  sort?: Array<string[] | string>;
  grid?: { columns?: Record<string, { width?: number }> };
  kibanaSavedObjectMeta?: { searchSourceJSON?: string };
  isTextBasedQuery?: boolean;
  usesAdHocDataView?: boolean;
  viewMode?: string;
  density?: string;
  headerRowHeight?: number;
  rowHeight?: number;
  rowsPerPage?: number;
  sampleSize?: number;
  hideChart?: boolean;
  breakdownField?: string;
  chartInterval?: string;
  controlGroupJson?: string;
}

function convertStoredTabToAsCode(
  tabAttributes: StoredTabAttributes,
  references: SavedObjectReference[]
) {
  const searchSourceJSON = tabAttributes.kibanaSavedObjectMeta?.searchSourceJSON;
  let filters;
  let query;
  let dataset;

  if (searchSourceJSON) {
    try {
      const parsedSearchSource = parseSearchSourceJSON(searchSourceJSON);

      let searchSource;
      try {
        searchSource = injectReferences(parsedSearchSource, references);
      } catch {
        searchSource = parsedSearchSource;
      }

      filters = fromStoredFilters(searchSource.filter);
      query = searchSource.query;

      if (searchSource.index) {
        dataset = { type: 'dataView' as const, id: searchSource.index as string };
      }
    } catch {
      // Fall through with undefined filters/query/dataset
    }
  }

  const columns = convertStoredColumnsToAsCode(tabAttributes.columns, tabAttributes.grid);
  const sort = convertStoredSortToAsCode(tabAttributes.sort);

  if (tabAttributes.isTextBasedQuery) {
    return {
      query,
      ...(columns ? { columns } : {}),
      ...(sort && sort.length > 0 ? { sort } : {}),
      ...(tabAttributes.viewMode !== undefined ? { view_mode: tabAttributes.viewMode } : {}),
      ...(tabAttributes.density !== undefined ? { density: tabAttributes.density } : {}),
      ...(tabAttributes.headerRowHeight !== undefined
        ? { header_row_height: tabAttributes.headerRowHeight }
        : {}),
      ...(tabAttributes.rowHeight !== undefined ? { row_height: tabAttributes.rowHeight } : {}),
    };
  }

  return {
    ...(query ? { query } : {}),
    filters: filters ?? [],
    ...(dataset ? { dataset } : {}),
    ...(columns ? { columns } : {}),
    ...(sort && sort.length > 0 ? { sort } : {}),
    ...(tabAttributes.viewMode !== undefined ? { view_mode: tabAttributes.viewMode } : {}),
    ...(tabAttributes.density !== undefined ? { density: tabAttributes.density } : {}),
    ...(tabAttributes.headerRowHeight !== undefined
      ? { header_row_height: tabAttributes.headerRowHeight }
      : {}),
    ...(tabAttributes.rowHeight !== undefined ? { row_height: tabAttributes.rowHeight } : {}),
    ...(tabAttributes.rowsPerPage !== undefined
      ? { rows_per_page: tabAttributes.rowsPerPage }
      : {}),
    ...(tabAttributes.sampleSize !== undefined ? { sample_size: tabAttributes.sampleSize } : {}),
  };
}

export function getAsCodeTransformOut(transformDrilldownsOut: DrilldownTransforms['transformOut']) {
  function transformOut(
    storedState: StoredSearchEmbeddableState,
    references?: SavedObjectReference[]
  ) {
    const transformsFlow = flow(
      transformTitlesOut<StoredSearchEmbeddableState>,
      transformTimeRangeOut<StoredSearchEmbeddableState>,
      (state: StoredSearchEmbeddableState) => transformDrilldownsOut(state, references)
    );
    const state = transformsFlow(storedState);

    if (isByValue(state)) {
      const attrs = state.attributes.tabs?.length
        ? state.attributes
        : extractTabs(state.attributes);
      const asCodeTabs = attrs.tabs.map((tab) => {
        const tabAttrs = tab.attributes as unknown as StoredTabAttributes;
        return convertStoredTabToAsCode(tabAttrs, references ?? []);
      });

      const { attributes, ...rest } = state;
      return {
        ...rest,
        tabs: asCodeTabs,
      };
    }

    const savedObjectRef = (references ?? []).find(
      (ref) => SavedSearchType === ref.type && ref.name === SAVED_SEARCH_SAVED_OBJECT_REF_NAME
    );
    const { ...rest } = state;
    return {
      ...rest,
      ...(savedObjectRef?.id ? { discover_session_id: savedObjectRef.id } : {}),
    };
  }

  return transformOut;
}
