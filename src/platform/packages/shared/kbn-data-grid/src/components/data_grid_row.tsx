/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import { DATA_GRID_ROW_CLASS } from '../constants';
import type { ColumnLayout } from '../hooks/use_column_virtualization';
import type { DataGridStyles } from '../styles';
import type {
  DataGridCellKey,
  DataGridExpandedCell,
  DataGridInternalColumn,
  DataGridProps,
  DataGridRowItem,
} from '../types';
import { DataGridCell } from './data_grid_cell';

/** What the rows and the header share about the (virtualized) columns. */
export interface DataGridColumnSlices<TRow> {
  columns: Array<DataGridInternalColumn<TRow>>;
  layouts: ColumnLayout[];
  /** Indexes into `columns`: the sticky columns before, the virtualized ones, the sticky ones after. */
  leading: number[];
  middle: number[];
  trailing: number[];
  /** Space of the virtualized columns that are not rendered, before and after the rendered ones. */
  startSpacer: number;
  endSpacer: number;
  totalWidth: number;
}

export const ColumnSpacer = ({ width, styles }: { width: number; styles: DataGridStyles }) =>
  width > 0 ? <div role="presentation" css={styles.spacer} style={{ width }} /> : null;

interface DataGridRowProps<TRow> {
  item: DataGridRowItem<TRow>;
  slices: DataGridColumnSlices<TRow>;
  getCellProps?: DataGridProps<TRow>['getCellProps'];
  getRowProps?: DataGridProps<TRow>['getRowProps'];
  renderCellPopover?: DataGridProps<TRow>['renderCellPopover'];
  showCellPopoverCloseButton?: boolean;
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
  item,
  slices,
  getCellProps,
  getRowProps,
  renderCellPopover,
  showCellPopoverCloseButton,
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
  } = getRowProps?.({ row: item.row, rowIndex: item.index }) ?? {};
  const { columns, layouts, leading, middle, trailing, startSpacer, endSpacer, totalWidth } =
    slices;

  // The last data cell that is rendered ends the row when a selection is copied as tabular text.
  const lastCopyColumnIndex = [...leading, ...middle]
    .filter((index) => !columns[index].isControl)
    .pop();

  const renderCell = (columnIndex: number) => {
    const column = columns[columnIndex];
    return (
      <DataGridCell
        key={column.id}
        column={column}
        row={item.row}
        rowId={item.id}
        rowIndex={item.index}
        colIndex={columnIndex + 1}
        renderCellPopover={renderCellPopover}
        showCellPopoverCloseButton={showCellPopoverCloseButton}
        expandedAnchorRect={
          expandedCell?.columnId === column.id ? expandedCell.anchorRect : undefined
        }
        onOpenExpansion={onOpenExpansion}
        onCloseExpansion={onCloseExpansion}
        styles={styles}
        layout={layouts[columnIndex]}
        getCellProps={getCellProps}
        isTabStop={columnIndex + 1 === tabStopColIndex}
        isLastCopyColumn={columnIndex === lastCopyColumnIndex}
      />
    );
  };

  return (
    <div
      ref={measureElement}
      data-index={virtualIndex}
      role="row"
      aria-rowindex={ariaRowIndex}
      data-test-subj={dataTestSubj}
      className={className ? `${DATA_GRID_ROW_CLASS} ${className}` : DATA_GRID_ROW_CLASS}
      data-striped={isStriped}
      css={[styles.row, extraCss]}
      style={{ inlineSize: totalWidth }}
    >
      {leading.map(renderCell)}
      <ColumnSpacer width={startSpacer} styles={styles} />
      {middle.map(renderCell)}
      <ColumnSpacer width={endSpacer} styles={styles} />
      {trailing.map(renderCell)}
    </div>
  );
};

export const DataGridRow = memo(DataGridRowComponent) as typeof DataGridRowComponent;
