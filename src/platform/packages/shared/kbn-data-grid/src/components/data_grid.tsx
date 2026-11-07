/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowPinningState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useResizeObserver } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DEFAULT_ESTIMATED_ROW_HEIGHT, OVERSCAN } from '../constants';
import { useColumnSizing } from '../hooks/use_column_sizing';
import { useGridNavigation } from '../hooks/use_grid_navigation';
import { componentStyles, getColumnLayoutStyles } from '../styles';
import { observeCellContentFocus } from '../utils/cell_content_focus';
import type {
  DataGridCellKey,
  DataGridControlColumn,
  DataGridExpandedCell,
  DataGridInternalColumn,
  DataGridProps,
} from '../types';
import { DataGridHeaderRow } from './data_grid_header_row';
import { DataGridRow } from './data_grid_row';

const toInternalColumn = <TRow,>({
  width,
  ...column
}: DataGridControlColumn<TRow>): DataGridInternalColumn<TRow> => ({
  ...column,
  initialWidth: width,
  minWidth: width,
  maxWidth: width,
  isControl: true,
});

/**
 * Generic, virtualized data grid. It knows nothing about the shape of the rows: columns describe how
 * to render a row. Memoize `columns`, a new array rebuilds the column model.
 */
export const DataGrid = <TRow,>({
  rows,
  columns: dataColumns,
  leadingControlColumns,
  trailingControlColumns,
  getRowId,
  ariaLabel,
  'data-test-subj': dataTestSubj = 'kbnDataGrid',
  getCellProps,
  getRowProps,
  pinnedRowIds,
  showHeader = true,
  estimatedRowHeight = DEFAULT_ESTIMATED_ROW_HEIGHT,
  columnWidths,
  onColumnResize,
  initialScrollOffset = 0,
  onScrollOffsetChange,
  gridRef,
}: DataGridProps<TRow>) => {
  const styles = useMemoCss(componentStyles);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const columns = useMemo<Array<DataGridInternalColumn<TRow>>>(
    () => [
      ...(leadingControlColumns ?? []).map(toInternalColumn),
      ...dataColumns.map((column) => ({ ...column, isControl: false })),
      ...(trailingControlColumns ?? []).map(toInternalColumn),
    ],
    [dataColumns, leadingControlColumns, trailingControlColumns]
  );

  // The scroll element is also the measured grid width, used for the initial column widths.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const setScrollRef = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    setScrollElement(element);
  }, []);
  const { width: gridWidth } = useResizeObserver(scrollElement, 'width');

  // Interactive cell content stays out of the tab order until its cell is entered.
  useEffect(
    () => (scrollElement ? observeCellContentFocus(scrollElement) : undefined),
    [scrollElement]
  );

  // Header and pinned rows share one sticky block, which the virtualized rows scroll below.
  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const { columnSizing, columnSizingInfo, setColumnSizing, setColumnSizingInfo, ...sizing } =
    useColumnSizing({ columns, gridWidth, columnWidths, onColumnResize });

  const rowPinning = useMemo<RowPinningState>(() => {
    const pinnedIds = new Set(pinnedRowIds);
    return { top: rows.map(getRowId).filter((id) => pinnedIds.has(id)), bottom: [] };
  }, [rows, getRowId, pinnedRowIds]);

  const tableColumns = useMemo<Array<ColumnDef<TRow>>>(
    () =>
      columns.map(({ id, minWidth, maxWidth, isResizable = false, initialWidth }) => ({
        id,
        minSize: minWidth,
        maxSize: maxWidth,
        // Columns without an initial width fill the remaining space, a dragged width has no effect.
        enableResizing: isResizable && initialWidth !== undefined,
        header: () => null,
      })),
    [columns]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    columnResizeMode: 'onChange',
    // Pinning is owned by the parent, TanStack row pinning mirrors it.
    enableRowPinning: false,
    keepPinnedRows: true,
    state: { columnSizing, columnSizingInfo, rowPinning },
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
  });

  const pinnedRows = table.getTopRows();
  const virtualizedRows = table.getCenterRows();

  const estimateSize = useCallback(() => estimatedRowHeight, [estimatedRowHeight]);
  // Must be stable: a new function makes the virtualizer rebuild all row measurements.
  const getItemKey = useCallback(
    (index: number) => virtualizedRows[index]?.id ?? index,
    [virtualizedRows]
  );

  const rowVirtualizer = useVirtualizer({
    count: virtualizedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: initialScrollOffset,
    getItemKey,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  useImperativeHandle(
    gridRef,
    () => ({
      scrollToRow: (rowId: string) => {
        const index = virtualizedRows.findIndex(({ id }) => id === rowId);
        if (index >= 0) {
          rowVirtualizer.scrollToIndex(index);
        }
      },
    }),
    [virtualizedRows, rowVirtualizer]
  );

  const scrollToVirtualizedRow = useCallback(
    (index: number) => rowVirtualizer.scrollToIndex(index),
    [rowVirtualizer]
  );

  const { ariaRowIndexOffset, getTabStopColIndex, onFocus, onKeyDown } = useGridNavigation({
    scrollRef,
    showHeader,
    colCount: columns.length,
    firstDataColIndex: columns.findIndex(({ isControl }) => !isControl) + 1 || 1,
    rowCount: rows.length,
    pinnedRowCount: pinnedRows.length,
    virtualItems,
    virtualizedRowCount: virtualizedRows.length,
    scrollToVirtualizedRow,
  });

  const onScroll = useCallback(() => {
    if (scrollRef.current) {
      onScrollOffsetChange?.(scrollRef.current.scrollTop);
    }
  }, [onScrollOffsetChange]);

  const columnLayouts = useMemo(
    () =>
      columns.map(({ initialWidth }, columnIndex) =>
        getColumnLayoutStyles(columnIndex, initialWidth !== undefined)
      ),
    [columns]
  );

  // Only one cell can be expanded: opening another replaces it.
  const [expandedCell, setExpandedCell] = useState<DataGridExpandedCell>();
  // Only closes the cell that asks for it: the popover of a previously expanded cell can report
  // its close (outside click, focus trap) after another cell was opened, which must stay open.
  const closeExpansion = useCallback(
    ({ rowId, columnId }: DataGridCellKey) =>
      setExpandedCell((prev) =>
        prev?.rowId === rowId && prev.columnId === columnId ? undefined : prev
      ),
    []
  );
  useEffect(() => {
    if (expandedCell && !rows.some((row) => getRowId(row) === expandedCell.rowId)) {
      setExpandedCell(undefined);
    }
  }, [rows, getRowId, expandedCell]);

  // What pinned and virtualized rows have in common.
  const sharedRowProps = {
    columns,
    columnLayouts,
    getCellProps,
    getRowProps,
    styles,
    onOpenExpansion: setExpandedCell,
    onCloseExpansion: closeExpansion,
  };

  return (
    <div
      ref={setScrollRef}
      onScroll={onScroll}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="grid"
      aria-rowcount={rows.length + (showHeader ? 1 : 0)}
      aria-colcount={columns.length}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      css={styles.scrollContainer}
      style={sizing.widthVars}
    >
      <div ref={setStickyElement} css={styles.stickyTop}>
        {showHeader &&
          table
            .getHeaderGroups()
            .map((headerGroup) => (
              <DataGridHeaderRow
                key={headerGroup.id}
                headerGroup={headerGroup}
                columns={columns}
                columnLayouts={columnLayouts}
                styles={styles}
                tabStopColIndex={getTabStopColIndex(1)}
                onResetColumnWidth={sizing.resetColumnWidth}
              />
            ))}
        {pinnedRows.length > 0 && (
          <div data-test-subj={`${dataTestSubj}-pinnedRows`} css={styles.pinnedRows}>
            {pinnedRows.map((tableRow, index) => {
              const ariaRowIndex = index + ariaRowIndexOffset;
              return (
                <DataGridRow
                  {...sharedRowProps}
                  key={tableRow.id}
                  row={tableRow}
                  expandedCell={expandedCell?.rowId === tableRow.id ? expandedCell : undefined}
                  ariaRowIndex={ariaRowIndex}
                  isStriped={index % 2 === 1}
                  tabStopColIndex={getTabStopColIndex(ariaRowIndex)}
                />
              );
            })}
          </div>
        )}
      </div>
      <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
        <div
          css={styles.virtualInner}
          style={{
            transform: `translateY(${
              (virtualItems[0]?.start ?? stickyHeight) - rowVirtualizer.options.scrollMargin
            }px)`,
          }}
        >
          {virtualItems.map(({ index, key }) => {
            const tableRow = virtualizedRows[index];
            if (!tableRow) {
              return null;
            }
            const rowIndex = pinnedRows.length + index;
            const ariaRowIndex = rowIndex + ariaRowIndexOffset;
            return (
              <DataGridRow
                {...sharedRowProps}
                key={key}
                row={tableRow}
                expandedCell={expandedCell?.rowId === tableRow.id ? expandedCell : undefined}
                ariaRowIndex={ariaRowIndex}
                isStriped={rowIndex % 2 === 1}
                tabStopColIndex={getTabStopColIndex(ariaRowIndex)}
                virtualIndex={index}
                measureElement={rowVirtualizer.measureElement}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
