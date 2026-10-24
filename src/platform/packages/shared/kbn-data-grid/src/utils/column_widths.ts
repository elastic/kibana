/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MIN_FILL_COLUMN_WIDTH } from '../constants';
import type { DataGridInternalColumn } from '../types';
import { clamp } from './grid_navigation';

export const resolveInitialWidth = <TRow>(
  { initialWidth }: DataGridInternalColumn<TRow>,
  gridWidth: number
) => (typeof initialWidth === 'function' ? initialWidth(gridWidth) : initialWidth);

export const clampColumnWidth = <TRow>(
  { minWidth = 0, maxWidth = Infinity }: DataGridInternalColumn<TRow>,
  width: number
) => clamp(width, minWidth, maxWidth);

interface GetColumnWidthsParams<TRow> {
  columns: Array<DataGridInternalColumn<TRow>>;
  /** Widths in pixels by column id, set by the consumer or by the user resizing a column. */
  userWidths: Record<string, number>;
  gridWidth: number;
}

/**
 * Width in pixels of every column. Columns with an (initial) width are fixed, the others share the
 * space that is left, but never get narrower than `MIN_FILL_COLUMN_WIDTH`: the grid scrolls instead.
 */
export const getColumnWidths = <TRow>({
  columns,
  userWidths,
  gridWidth,
}: GetColumnWidthsParams<TRow>): number[] => {
  const fixedWidths = columns.map((column) => {
    const width = userWidths[column.id] ?? resolveInitialWidth(column, gridWidth);
    return width === undefined ? undefined : clampColumnWidth(column, width);
  });

  const fixedTotal = fixedWidths.reduce<number>((total, width) => total + (width ?? 0), 0);
  const fillCount = fixedWidths.filter((width) => width === undefined).length;
  const fillWidth =
    fillCount > 0 ? Math.max((gridWidth - fixedTotal) / fillCount, MIN_FILL_COLUMN_WIDTH) : 0;

  return fixedWidths.map((width, index) =>
    width === undefined ? clampColumnWidth(columns[index], fillWidth) : width
  );
};
