/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableVisualizationState, ColumnState } from '@kbn/lens-common';
import {
  LENS_ROW_HEIGHT_MODE,
  LEGACY_SINGLE_ROW_HEIGHT_MODE,
  LENS_DATAGRID_DENSITY,
} from '@kbn/lens-common';
import type { DatatableState } from '../../../../schema';
import { isMetricColumn, getAccessorName } from '../helpers';
import { METRIC_ACCESSOR_PREFIX, ROW_ACCESSOR_PREFIX } from '../constants';

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

  const height: Record<string, unknown> = {};
  const isLegacySingleMode = (heightMode: string) => heightMode === LEGACY_SINGLE_ROW_HEIGHT_MODE;
  const getHeightMode = (heightMode?: string) =>
    heightMode
      ? isLegacySingleMode(heightMode)
        ? LENS_ROW_HEIGHT_MODE.custom
        : heightMode
      : LENS_ROW_HEIGHT_MODE.custom;

  if (rowHeight || rowHeightLines) {
    // Handle legacy 'single' row height mode by mapping it to 'custom'
    const isLegacyRowHeight = rowHeight ? isLegacySingleMode(rowHeight) : false;
    const heightMode = getHeightMode(rowHeight);
    const shouldIncludeLines =
      (heightMode === LENS_ROW_HEIGHT_MODE.custom && rowHeightLines) || isLegacyRowHeight;
    height.value = {
      type: heightMode,
      ...(shouldIncludeLines ? { lines: rowHeightLines ?? 1 } : {}),
    };
  }

  if (headerRowHeight || headerRowHeightLines) {
    // Handle legacy 'single' header row height mode by mapping it to 'custom'
    const isLegacyHeaderRowHeight = headerRowHeight ? isLegacySingleMode(headerRowHeight) : false;
    const heightMode = getHeightMode(headerRowHeight);
    const shouldIncludeMaxLines =
      (heightMode === LENS_ROW_HEIGHT_MODE.custom && headerRowHeightLines) ||
      isLegacyHeaderRowHeight;
    height.header = {
      type: heightMode,
      ...(shouldIncludeMaxLines ? { max_lines: headerRowHeightLines ?? 1 } : {}),
    };
  }

  return {
    ...(density ? { mode: density === LENS_DATAGRID_DENSITY.NORMAL ? 'default' : density } : {}),
    ...(Object.keys(height).length > 0 ? { height } : {}),
  };
}

function parseColumnIndex(columnId: string, prefix: string): number | undefined {
  if (!columnId.startsWith(prefix)) {
    return undefined;
  }
  const index = parseInt(columnId.slice(prefix.length), 10);
  return isNaN(index) ? undefined : index;
}

function parseSplitMetricsBySorting(
  columnId: string,
  metricColumnIds: (string | undefined)[]
): { values: string[]; metricIndex: number } | undefined {
  // Format: value1---value2---...---metricColumnId
  const parts = columnId.split('---');
  if (parts.length < 2) {
    return undefined;
  }

  const metricColumnId = parts[parts.length - 1];
  const metricIndex = metricColumnIds.indexOf(metricColumnId);
  if (metricIndex === -1) {
    return undefined;
  }

  return {
    values: parts.slice(0, -1),
    metricIndex,
  };
}

function parseSortingToAPI(
  sorting: DatatableVisualizationState['sorting'],
  columns: ColumnState[],
  isFormBased: boolean
): DatatableState['sorting'] | undefined {
  if (!sorting?.columnId || sorting.direction === 'none') {
    return;
  }

  const { columnId, direction } = sorting;

  // Split_metrics_by sorting (contains ---)
  if (columnId.includes('---')) {
    const metricColumnIds = columns
      // @TODO: fix how to correctly identify metric columns
      .filter((col) => isMetricColumn(col, isFormBased))
      .map((col) => col.columnId);

    const parsed = parseSplitMetricsBySorting(columnId, metricColumnIds);
    return parsed
      ? {
          by: 'split_metrics_by',
          metric_index: parsed.metricIndex,
          values: parsed.values,
          direction,
        }
      : undefined;
  }

  // Metric column sorting
  const metricIndex = parseColumnIndex(columnId, `${getAccessorName(METRIC_ACCESSOR_PREFIX)}_`);
  if (metricIndex !== undefined) {
    return { by: 'metric', index: metricIndex, direction };
  }

  // Row column sorting
  const rowIndex = parseColumnIndex(columnId, `${getAccessorName(ROW_ACCESSOR_PREFIX)}_`);
  if (rowIndex !== undefined) {
    return { by: 'row', index: rowIndex, direction };
  }

  return;
}

export function convertAppearanceToAPIFormat(
  visualization: DatatableVisualizationState,
  isFormBased: boolean
): Pick<DatatableState, 'density' | 'paging' | 'sorting'> {
  const { paging, sorting, columns } = visualization;

  const densityAPI = parseDensityToAPI(visualization);
  const sortingAPI = parseSortingToAPI(sorting, columns, isFormBased);

  const isValidPagingSize = (size: number): size is 10 | 20 | 30 | 50 | 100 => {
    return [10, 20, 30, 50, 100].includes(size);
  };

  return {
    ...(densityAPI ? { density: densityAPI } : {}),
    ...(paging && paging.enabled
      ? { paging: isValidPagingSize(paging.size) ? paging.size : 10 }
      : {}),
    ...(sortingAPI ? { sorting: sortingAPI } : {}),
  };
}
