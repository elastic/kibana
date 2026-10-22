/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent, PointerEvent, TouchEvent } from 'react';
import React from 'react';
import { DATA_GRID_HEADER_ROW_CLASS } from '../constants';
import type { DataGridStyles } from '../styles';
import type { ColumnDragState } from '../hooks/use_column_drag';
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
  /** Set when the data columns can be dragged to reorder them. */
  onStartDrag?: (columnId: string, event: PointerEvent) => void;
  dragState?: ColumnDragState;
}

const getCellDragState = (columnId: string, dragState: ColumnDragState | undefined) => {
  if (!dragState) {
    return undefined;
  }
  if (dragState.columnId === columnId) {
    return 'dragging';
  }
  if (dragState.dropColumnId !== columnId) {
    return undefined;
  }
  return dragState.dropSide === 'before' ? 'dropBefore' : 'dropAfter';
};

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
  onStartDrag,
  dragState,
}: DataGridHeaderRowProps<TRow>) => {
  const { columns, layouts, leading, middle, trailing, startSpacer, endSpacer, totalWidth } =
    slices;

  // Moving a column is limited to the data columns, the control columns stay where they are.
  const leadingControlCount = columns.findIndex(({ isControl }) => !isControl);
  const dataColumnCount = columns.filter(({ isControl }) => !isControl).length;

  const renderHeaderCell = (columnIndex: number) => (
    <DataGridHeaderCell
      key={columns[columnIndex].id}
      column={columns[columnIndex]}
      columnIndex={columnIndex}
      dataColumnIndex={columnIndex - Math.max(leadingControlCount, 0)}
      dataColumnCount={dataColumnCount}
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
      onStartDrag={onStartDrag}
      dragState={getCellDragState(columns[columnIndex].id, dragState)}
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
