/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent, TouchEvent } from 'react';
import React from 'react';
import { DATA_GRID_HEADER_ROW_CLASS } from '../constants';
import type { DataGridStyles } from '../styles';
import type { DataGridProps } from '../types';
import { DataGridHeaderCell } from './data_grid_header_cell';
import type { DataGridColumnSlices } from './data_grid_row';
import { ColumnSpacer } from './data_grid_row';

interface DataGridHeaderRowProps<TRow> {
  slices: DataGridColumnSlices<TRow>;
  styles: DataGridStyles;
  /** Column index (1-based) of the grid's tab stop when it is in the header. */
  tabStopColIndex?: number;
  resizingColumnId?: string;
  sorting?: DataGridProps<TRow>['sorting'];
  headerRowHeight?: DataGridProps<TRow>['headerRowHeight'];
  onMoveColumn?: DataGridProps<TRow>['onMoveColumn'];
  onHideColumn?: DataGridProps<TRow>['onHideColumn'];
  onStartResize: (columnIndex: number, event: MouseEvent | TouchEvent) => void;
  onResetColumnWidth: (columnIndex: number) => void;
}

export const DataGridHeaderRow = <TRow,>({
  slices,
  styles,
  tabStopColIndex,
  resizingColumnId,
  sorting,
  headerRowHeight,
  onMoveColumn,
  onHideColumn,
  onStartResize,
  onResetColumnWidth,
}: DataGridHeaderRowProps<TRow>) => {
  const { columns, layouts, leading, middle, trailing, startSpacer, endSpacer, totalWidth } =
    slices;

  const renderHeaderCell = (columnIndex: number) => (
    <DataGridHeaderCell
      key={columns[columnIndex].id}
      column={columns[columnIndex]}
      columnIndex={columnIndex}
      columnCount={columns.length}
      layout={layouts[columnIndex]}
      styles={styles}
      isTabStop={columnIndex + 1 === tabStopColIndex}
      isResizing={resizingColumnId === columns[columnIndex].id}
      sorting={sorting}
      headerRowHeight={headerRowHeight}
      onMoveColumn={onMoveColumn}
      onHideColumn={onHideColumn}
      onStartResize={onStartResize}
      onResetColumnWidth={onResetColumnWidth}
    />
  );

  return (
    <div
      role="row"
      aria-rowindex={1}
      className={DATA_GRID_HEADER_ROW_CLASS}
      css={styles.headerRow}
      style={{ inlineSize: totalWidth }}
    >
      {leading.map(renderHeaderCell)}
      <ColumnSpacer width={startSpacer} styles={styles} />
      {middle.map(renderHeaderCell)}
      <ColumnSpacer width={endSpacer} styles={styles} />
      {trailing.map(renderHeaderCell)}
    </div>
  );
};
