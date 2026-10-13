/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import { defaultTimeColumnWidth } from '@kbn/unified-data-table';
import type { UnifiedDataTableSettings } from '@kbn/unified-data-table';
import {
  CONTROL_COL_WIDTH,
  DEFAULT_COL_WIDTH,
  MIN_COL_WIDTH,
  SELECT_COL_WIDTH,
} from './tanstack_data_grid.styles';

export const LEADING_CONTROL_COLUMNS_WIDTH = CONTROL_COL_WIDTH + SELECT_COL_WIDTH;

export type TanStackColumnLayoutMode = 'flex' | 'scroll';

export interface TanStackDataColumnDescriptor {
  id: string;
  isSummary?: boolean;
  isTimestamp?: boolean;
}

export interface ComputeTanStackColumnLayoutParams {
  containerWidth: number;
  dataColumns: TanStackDataColumnDescriptor[];
  timeFieldName?: string;
  columnSizing: Record<string, number>;
  settings?: UnifiedDataTableSettings;
  leadingControlColumnsWidth?: number;
  defaultDataColumnWidth?: number;
  minDataColumnWidth?: number;
}

export interface TanStackColumnLayout {
  mode: TanStackColumnLayoutMode;
  gridWidth: number | '100%';
  timeColumnWidth: number;
  getColumnStyle: (column: TanStackDataColumnDescriptor) => CSSProperties;
}

export const getTimeColumnWidth = (
  timeFieldName: string | undefined,
  columnSizing: Record<string, number>,
  settings?: UnifiedDataTableSettings
): number => {
  if (!timeFieldName) {
    return defaultTimeColumnWidth;
  }

  return (
    columnSizing[timeFieldName] ??
    settings?.columns?.[timeFieldName]?.width ??
    defaultTimeColumnWidth
  );
};

export const computeTanStackColumnLayout = ({
  containerWidth,
  dataColumns,
  timeFieldName,
  columnSizing,
  settings,
  leadingControlColumnsWidth = LEADING_CONTROL_COLUMNS_WIDTH,
  defaultDataColumnWidth = DEFAULT_COL_WIDTH,
  minDataColumnWidth = MIN_COL_WIDTH,
}: ComputeTanStackColumnLayoutParams): TanStackColumnLayout => {
  const timeColumnWidth = getTimeColumnWidth(timeFieldName, columnSizing, settings);
  let fixedWidth = leadingControlColumnsWidth;
  const flexColumns: TanStackDataColumnDescriptor[] = [];
  const explicitWidths = new Map<string, number>();

  for (const column of dataColumns) {
    if (column.isSummary) {
      flexColumns.push(column);
      continue;
    }

    if (column.isTimestamp || column.id === timeFieldName) {
      fixedWidth += timeColumnWidth;
      explicitWidths.set(column.id, timeColumnWidth);
      continue;
    }

    const explicitWidth = columnSizing[column.id] ?? settings?.columns?.[column.id]?.width;

    if (explicitWidth != null) {
      fixedWidth += explicitWidth;
      explicitWidths.set(column.id, explicitWidth);
    } else {
      flexColumns.push(column);
    }
  }

  const remainingWidth = containerWidth - fixedWidth;
  const flexWidthPerColumn =
    flexColumns.length > 0 ? remainingWidth / flexColumns.length : remainingWidth;

  const useFlexibleLayout =
    flexColumns.length > 0 && (containerWidth === 0 || flexWidthPerColumn >= minDataColumnWidth);

  if (useFlexibleLayout) {
    return {
      mode: 'flex',
      gridWidth: '100%',
      timeColumnWidth,
      getColumnStyle: (column) => {
        if (column.isSummary) {
          return { flex: '1 1 0', minWidth: 0, width: 0 };
        }

        if (column.isTimestamp || column.id === timeFieldName) {
          return { width: timeColumnWidth, flexShrink: 0 };
        }

        const explicit = explicitWidths.get(column.id);

        if (explicit != null) {
          return { width: explicit, flexShrink: 0 };
        }

        return { flex: '1 1 0', minWidth: minDataColumnWidth, width: 0 };
      },
    };
  }

  const scrollWidth = fixedWidth + flexColumns.length * defaultDataColumnWidth;

  return {
    mode: 'scroll',
    gridWidth: scrollWidth,
    timeColumnWidth,
    getColumnStyle: (column) => {
      if (column.isSummary) {
        return { flex: '1 1 0', minWidth: 0, width: 0 };
      }

      if (column.isTimestamp || column.id === timeFieldName) {
        return { width: timeColumnWidth, flexShrink: 0 };
      }

      const width =
        explicitWidths.get(column.id) ??
        columnSizing[column.id] ??
        settings?.columns?.[column.id]?.width ??
        defaultDataColumnWidth;

      return { width, flexShrink: 0 };
    },
  };
};
