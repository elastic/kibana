/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { Row } from '@tanstack/react-table';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { SerializedStyles } from '@emotion/react';
import { DATA_GRID_ROW_CLASS } from '../constants';
import type { DataGridStyles } from '../styles';
import type {
  DataGridCellKey,
  DataGridExpandedCell,
  DataGridInternalColumn,
  DataGridProps,
} from '../types';
import { DataGridCell } from './data_grid_cell';

interface DataGridRowProps<TRow> {
  row: Row<TRow>;
  columns: Array<DataGridInternalColumn<TRow>>;
  columnLayouts: SerializedStyles[];
  getCellProps?: DataGridProps<TRow>['getCellProps'];
  getRowProps?: DataGridProps<TRow>['getRowProps'];
  /** Set only for the row that has the open expansion popover. */
  expandedCell?: DataGridExpandedCell;
  onOpenExpansion: (cell: DataGridExpandedCell) => void;
  onCloseExpansion: (cell: DataGridCellKey) => void;
  ariaRowIndex: number;
  isStriped: boolean;
  styles: DataGridStyles;
  /** Column index (1-based) of the grid's tab stop when it is in this row. */
  tabStopColIndex?: number;
  // Set for virtualized rows, so the virtualizer can measure their auto height.
  virtualIndex?: number;
  measureElement?: Virtualizer<HTMLDivElement, Element>['measureElement'];
}

const DataGridRowComponent = <TRow,>({
  row,
  columns,
  columnLayouts,
  getCellProps,
  getRowProps,
  expandedCell,
  onOpenExpansion,
  onCloseExpansion,
  ariaRowIndex,
  isStriped,
  styles,
  tabStopColIndex,
  virtualIndex,
  measureElement,
}: DataGridRowProps<TRow>) => {
  const {
    css: extraCss,
    className,
    'data-test-subj': dataTestSubj,
  } = getRowProps?.({ row: row.original, rowIndex: row.index }) ?? {};

  return (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      data-test-subj={dataTestSubj}
      className={className ? `${DATA_GRID_ROW_CLASS} ${className}` : DATA_GRID_ROW_CLASS}
      css={[styles.row, isStriped && styles.rowStriped, extraCss]}
    >
      {columns.map((column, columnIndex) => (
        <DataGridCell
          key={column.id}
          column={column}
          row={row.original}
          rowId={row.id}
          rowIndex={row.index}
          expandedAnchorRect={
            expandedCell?.columnId === column.id ? expandedCell.anchorRect : undefined
          }
          onOpenExpansion={onOpenExpansion}
          onCloseExpansion={onCloseExpansion}
          colIndex={columnIndex + 1}
          styles={styles}
          layoutCss={columnLayouts[columnIndex]}
          getCellProps={getCellProps}
          isTabStop={columnIndex + 1 === tabStopColIndex}
        />
      ))}
    </div>
  );
};

export const DataGridRow = memo(DataGridRowComponent) as typeof DataGridRowComponent;
