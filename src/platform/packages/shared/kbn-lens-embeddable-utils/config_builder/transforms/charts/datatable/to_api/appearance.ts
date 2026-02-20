/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableVisualizationState, RowHeightMode } from '@kbn/lens-common';
import { LENS_ROW_HEIGHT_MODE, LENS_DATAGRID_DENSITY } from '@kbn/lens-common';
import { parseTransposeId } from '@kbn/transpose-utils';
import type { DatatableState } from '../../../../schema';
import type { ColumnIdMapping } from './columns';
import { stripUndefined } from '../../utils';

type HeightAPI = NonNullable<NonNullable<DatatableState['density']>['height']>;
type ValueHeightAPI = HeightAPI['value'];
type HeaderHeightAPI = HeightAPI['header'];

function buildHeightAPI(
  type: 'value',
  heightMode?: RowHeightMode,
  heightLines?: number
): ValueHeightAPI | undefined;
function buildHeightAPI(
  type: 'header',
  heightMode?: RowHeightMode,
  heightLines?: number
): HeaderHeightAPI | undefined;
function buildHeightAPI(
  type: 'value' | 'header',
  heightMode?: RowHeightMode,
  heightLines?: number
): ValueHeightAPI | HeaderHeightAPI | undefined {
  if (!heightMode && !heightLines) {
    return undefined;
  }

  if (heightMode === LENS_ROW_HEIGHT_MODE.auto) {
    return { type: LENS_ROW_HEIGHT_MODE.auto };
  }

  const lines = heightLines ?? 1;
  return type === 'value'
    ? { type: LENS_ROW_HEIGHT_MODE.custom, lines }
    : { type: LENS_ROW_HEIGHT_MODE.custom, max_lines: lines };
}

function parseDensityToAPI(
  visualization: Pick<
    DatatableVisualizationState,
    'density' | 'rowHeight' | 'rowHeightLines' | 'headerRowHeight' | 'headerRowHeightLines'
  >
): DatatableState['density'] | undefined {
  const { rowHeight, headerRowHeight, density, rowHeightLines, headerRowHeightLines } =
    visualization;

  if (!rowHeight && !headerRowHeight && !density && !rowHeightLines && !headerRowHeightLines) {
    return;
  }

  const valueHeight = buildHeightAPI('value', rowHeight, rowHeightLines);
  const headerHeight = buildHeightAPI('header', headerRowHeight, headerRowHeightLines);
  const height = stripUndefined<NonNullable<NonNullable<DatatableState['density']>['height']>>({
    value: valueHeight,
    header: headerHeight,
  });

  return {
    ...(density ? { mode: density === LENS_DATAGRID_DENSITY.NORMAL ? 'default' : density } : {}),
    ...(Object.keys(height).length > 0 ? { height } : {}),
  };
}

/**
 * Parses pivoted metric sorting information from a column ID
 * Pivoted metrics are stored using transposed column IDs with format: value1---value2---...---metricColumnId
 */
function parsePivotedSorting(
  columnId: string,
  columnIdMapping: ColumnIdMapping
): { values: string[]; index: number } | undefined {
  const info = parseTransposeId(columnId);

  if (!info) {
    return undefined;
  }

  const mapped = columnIdMapping.get(info.id);

  if (!mapped || mapped.type !== 'metric') {
    return undefined;
  }

  return {
    values: info.values,
    index: mapped.index,
  };
}

/**
 * Converts sorting from old SO format to new API format using the columnIdMapping which maps old column IDs to their new API type and index.
 */
function parseSortingToAPI(
  sorting: DatatableVisualizationState['sorting'],
  columnIdMapping: ColumnIdMapping
): DatatableState['sort_by'] | undefined {
  if (!sorting?.columnId || sorting.direction === 'none') {
    return;
  }

  const { columnId, direction } = sorting;
  // Old SOs can have a missing direction, so we default to asc
  const DEFAULT_DIRECTION = 'asc' as const;

  const pivotedSorting = parsePivotedSorting(columnId, columnIdMapping);
  if (pivotedSorting) {
    return {
      column_type: 'pivoted_metric',
      index: pivotedSorting.index,
      values: pivotedSorting.values,
      direction: direction ?? DEFAULT_DIRECTION,
    };
  }

  // Look up the columnId in the mapping
  const mapped = columnIdMapping.get(columnId);
  if (!mapped || mapped.type === 'split_metrics_by') {
    return undefined;
  }

  return {
    column_type: mapped.type,
    index: mapped.index,
    direction: direction ?? DEFAULT_DIRECTION,
  };
}

export function convertAppearanceToAPIFormat(
  visualization: DatatableVisualizationState,
  columnIdMapping: ColumnIdMapping
): Pick<DatatableState, 'density' | 'paging' | 'sort_by'> {
  const { paging, sorting } = visualization;

  const densityAPI = parseDensityToAPI(visualization);
  const sortByAPI = parseSortingToAPI(sorting, columnIdMapping);

  const isValidPagingSize = (size: number): size is 10 | 20 | 30 | 50 | 100 => {
    return [10, 20, 30, 50, 100].includes(size);
  };

  return {
    ...(densityAPI ? { density: densityAPI } : {}),
    ...(paging && paging.enabled
      ? { paging: isValidPagingSize(paging.size) ? paging.size : 10 }
      : {}),
    ...(sortByAPI ? { sort_by: sortByAPI } : {}),
  };
}
