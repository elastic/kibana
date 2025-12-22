/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DatatableVisualizationState } from '@kbn/lens-common';
import {
  LENS_ROW_HEIGHT_MODE,
  LEGACY_SINGLE_ROW_HEIGHT_MODE,
  LENS_DATAGRID_DENSITY,
} from '@kbn/lens-common';
import type { DatatableState } from '../../../../schema';
import type { ColumnIdMapping } from './columns';

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

/**
 * Parses split_metrics_by sorting format: value1---value2---...---metricColumnId
 */
function parseSplitMetricsBySorting(
  columnId: string,
  columnIdMapping: ColumnIdMapping
): { values: string[]; metricIndex: number } | undefined {
  const parts = columnId.split('---');
  if (parts.length < 2) {
    return undefined;
  }

  // The last part is the metric column ID
  const metricColumnId = parts[parts.length - 1];
  const mapped = columnIdMapping[metricColumnId];

  if (!mapped || mapped.type !== 'metric') {
    return undefined;
  }

  return {
    values: parts.slice(0, -1),
    metricIndex: mapped.index,
  };
}

/**
 * Converts sorting from old SO format to new API format using the columnIdMapping which maps old column IDs to their new API type and index.
 */
function parseSortingToAPI(
  sorting: DatatableVisualizationState['sorting'],
  columnIdMapping: ColumnIdMapping
): DatatableState['sorting'] | undefined {
  if (!sorting?.columnId || sorting.direction === 'none') {
    return;
  }

  const { columnId, direction } = sorting;

  // Split_metrics_by sorting (contains ---)
  if (columnId.includes('---')) {
    const parsed = parseSplitMetricsBySorting(columnId, columnIdMapping);
    return parsed
      ? {
          by: 'split_metrics_by',
          metric_index: parsed.metricIndex,
          values: parsed.values,
          direction,
        }
      : undefined;
  }

  // Look up the columnId in the mapping
  const mapped = columnIdMapping[columnId];
  if (!mapped) {
    return undefined;
  }

  if (mapped.type === 'metric') {
    return { by: 'metric', index: mapped.index, direction };
  }

  if (mapped.type === 'row') {
    return { by: 'row', index: mapped.index, direction };
  }

  return undefined;
}

export function convertAppearanceToAPIFormat(
  visualization: DatatableVisualizationState,
  columnIdMapping: ColumnIdMapping
): Pick<DatatableState, 'density' | 'paging' | 'sorting'> {
  const { paging, sorting } = visualization;

  const densityAPI = parseDensityToAPI(visualization);
  const sortingAPI = parseSortingToAPI(sorting, columnIdMapping);

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
