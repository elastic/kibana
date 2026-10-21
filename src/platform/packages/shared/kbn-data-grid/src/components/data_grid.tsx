/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
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
  type ColumnSizingInfoState,
  type ColumnSizingState,
  type RowPinningState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useResizeObserver } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { DEFAULT_ESTIMATED_ROW_HEIGHT, OVERSCAN } from '../constants';
import { componentStyles, getColumnLayoutStyles, getColumnWidthVar } from '../styles';
import type { DataGridControlColumn, DataGridInternalColumn, DataGridProps } from '../types';
import type { GridPosition } from '../utils/grid_navigation';
import {
  GRID_CELL_SELECTOR,
  GRID_KEYS,
  clamp,
  getGridPosition,
  getNextGridPosition,
} from '../utils/grid_navigation';
import { DataGridRow } from './data_grid_row';

const INITIAL_COLUMN_SIZING_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: [],
};

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
  // Widths set by dragging a column, until the resize ends and `columnWidths` takes over.
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>(
    INITIAL_COLUMN_SIZING_INFO
  );

  const columns = useMemo<Array<DataGridInternalColumn<TRow>>>(
    () => [
      ...(leadingControlColumns ?? []).map(toInternalColumn),
      ...dataColumns.map((column) => ({ ...column, isControl: false })),
      ...(trailingControlColumns ?? []).map(toInternalColumn),
    ],
    [dataColumns, leadingControlColumns, trailingControlColumns]
  );

  // The scroll element is also the measured grid width, see the initial column widths below.
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);
  const setScrollRef = useCallback((element: HTMLDivElement | null) => {
    scrollRef.current = element;
    setScrollElement(element);
  }, []);
  const { width: gridWidth } = useResizeObserver(scrollElement, 'width');

  // Header and pinned rows share one sticky block, which the virtualized rows scroll below.
  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const rowPinning = useMemo<RowPinningState>(() => {
    const pinnedIds = new Set(pinnedRowIds);
    return { top: rows.map(getRowId).filter((id) => pinnedIds.has(id)), bottom: [] };
  }, [rows, getRowId, pinnedRowIds]);

  const tableColumns = useMemo<Array<ColumnDef<TRow>>>(
    () =>
      columns.map(({ id, minWidth, maxWidth, isResizable = false }) => ({
        id,
        minSize: minWidth,
        maxSize: maxWidth,
        enableResizing: isResizable,
        header: () => null,
      })),
    [columns]
  );

  // Columns follow the grid width until the user resizes them.
  const tableColumnSizing = useMemo<ColumnSizingState>(() => {
    const initialSizing: ColumnSizingState = {};
    columns.forEach(({ id, initialWidth }) => {
      if (initialWidth !== undefined) {
        initialSizing[id] =
          typeof initialWidth === 'function' ? initialWidth(gridWidth) : initialWidth;
      }
    });
    return { ...initialSizing, ...columnWidths, ...columnSizing };
  }, [columns, gridWidth, columnWidths, columnSizing]);

  // Report a resize once the user lets go of the handle, not on every pointer move.
  const tableColumnSizingRef = useRef(tableColumnSizing);
  tableColumnSizingRef.current = tableColumnSizing;
  const resizingColumnIdRef = useRef<string>();
  const { isResizingColumn } = columnSizingInfo;
  useEffect(() => {
    if (isResizingColumn) {
      resizingColumnIdRef.current = isResizingColumn;
      return;
    }
    const columnId = resizingColumnIdRef.current;
    if (columnId === undefined) {
      return;
    }
    resizingColumnIdRef.current = undefined;
    onColumnResize?.({ columnId, width: tableColumnSizingRef.current[columnId] });
    if (columnWidths) {
      // Controlled: from now on the width comes from `columnWidths`.
      setColumnSizing({});
    }
  }, [isResizingColumn, onColumnResize, columnWidths]);

  const resetColumnWidth = useCallback(
    (columnId: string) => {
      const initialWidth = columns.find(({ id }) => id === columnId)?.initialWidth;
      if (initialWidth === undefined) {
        return;
      }
      const width = typeof initialWidth === 'function' ? initialWidth(gridWidth) : initialWidth;
      // Drop the user's width, the column falls back to `columnWidths` or its initial width.
      setColumnSizing((prev) => {
        const next = { ...prev };
        delete next[columnId];
        return next;
      });
      onColumnResize?.({ columnId, width });
    },
    [columns, gridWidth, onColumnResize]
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
    state: { columnSizing: tableColumnSizing, columnSizingInfo, rowPinning },
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
  });

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();

  const estimateSize = useCallback(() => estimatedRowHeight, [estimatedRowHeight]);
  // Must be stable: a new function makes the virtualizer rebuild all row measurements.
  const getItemKey = useCallback((index: number) => centerRows[index]?.id ?? index, [centerRows]);

  const rowVirtualizer = useVirtualizer({
    count: centerRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: initialScrollOffset,
    getItemKey,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });

  useImperativeHandle(
    gridRef,
    () => ({
      scrollToRow: (rowId: string) => {
        const index = centerRows.findIndex(({ id }) => id === rowId);
        if (index >= 0) {
          rowVirtualizer.scrollToIndex(index);
        }
      },
    }),
    [centerRows, rowVirtualizer]
  );

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

  const containerStyle = useMemo(() => {
    const widthVars: Record<string, string> = {};
    columns.forEach(({ id, initialWidth, minWidth = 0, maxWidth = Infinity }, columnIndex) => {
      if (initialWidth !== undefined) {
        widthVars[getColumnWidthVar(columnIndex)] = `${clamp(
          tableColumnSizing[id],
          minWidth,
          maxWidth
        )}px`;
      }
    });
    // CSS custom properties are not part of React's CSSProperties type.
    return widthVars as CSSProperties;
  }, [columns, tableColumnSizing]);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const ariaRowIndexOffset = showHeader ? 2 : 1;
  const colCount = columns.length;
  const firstRow = showHeader ? 1 : ariaRowIndexOffset;
  const lastRow = Math.max(rows.length + ariaRowIndexOffset - 1, firstRow);
  // aria-rowindex of the first virtualized row.
  const centerStartRow = topRows.length + ariaRowIndexOffset;

  // Roving tabindex: the grid is a single tab stop, arrow keys move between its cells.
  const [tabStop, setTabStop] = useState<GridPosition>(() => ({
    row: ariaRowIndexOffset,
    col:
      Math.max(
        columns.findIndex(({ isControl }) => !isControl),
        0
      ) + 1,
  }));
  const effectiveTabStop = useMemo<GridPosition>(() => {
    let row = clamp(tabStop.row, firstRow, lastRow);
    // A virtualized row that is not rendered cannot be a tab stop, fall back to the first rendered one.
    if (row >= centerStartRow && virtualItems.length > 0) {
      const index = row - centerStartRow;
      const firstIndex = virtualItems[0].index;
      const lastIndex = virtualItems[virtualItems.length - 1].index;
      if (index < firstIndex || index > lastIndex) {
        row = centerStartRow + firstIndex;
      }
    }
    return { row, col: clamp(tabStop.col, 1, colCount) };
  }, [tabStop, firstRow, lastRow, centerStartRow, virtualItems, colCount]);

  const focusCell = useCallback(
    (position: GridPosition) => {
      const findCell = () =>
        scrollRef.current?.querySelector<HTMLElement>(
          `[role="row"][aria-rowindex="${position.row}"] [aria-colindex="${position.col}"]`
        );
      const cell = findCell();
      if (cell) {
        cell.focus();
        return;
      }
      // The row is virtualized out, scroll it into view and focus it once it is rendered.
      const centerIndex = position.row - centerStartRow;
      if (centerIndex < 0 || centerIndex >= centerRows.length) {
        return;
      }
      rowVirtualizer.scrollToIndex(centerIndex);
      let attempts = 10;
      const focusWhenRendered = () => {
        const renderedCell = findCell();
        if (renderedCell) {
          renderedCell.focus();
        } else if (--attempts > 0) {
          requestAnimationFrame(focusWhenRendered);
        }
      };
      requestAnimationFrame(focusWhenRendered);
    },
    [centerStartRow, centerRows.length, rowVirtualizer]
  );

  const onFocus = useCallback((event: FocusEvent<HTMLDivElement>) => {
    const position = getGridPosition(event.target);
    if (position) {
      setTabStop((prev) =>
        prev.row === position.row && prev.col === position.col ? prev : position
      );
    }
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      // Only while a cell or header itself is focused, not for content inside of it.
      if (!(event.target instanceof Element) || !event.target.matches(GRID_CELL_SELECTOR)) {
        return;
      }
      if (GRID_KEYS.has(event.key)) {
        event.stopPropagation();
      }
      const position = getGridPosition(event.target);
      const nextPosition =
        position && getNextGridPosition(position, event, { firstRow, lastRow, colCount });
      if (nextPosition) {
        event.preventDefault();
        event.stopPropagation();
        focusCell(nextPosition);
      }
    },
    [firstRow, lastRow, colCount, focusCell]
  );

  return (
    <div
      ref={setScrollRef}
      onScroll={onScroll}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      tabIndex={-1}
      role="grid"
      aria-rowcount={rows.length + (showHeader ? 1 : 0)}
      aria-colcount={colCount}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      css={styles.scrollContainer}
      style={containerStyle}
    >
      <div ref={setStickyElement} css={styles.stickyTop}>
        {showHeader &&
          table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} role="row" aria-rowindex={1} css={styles.headerRow}>
              {headerGroup.headers.map((header) => {
                const columnIndex = header.column.getIndex();
                const colIndex = columnIndex + 1;
                const isTabStop = effectiveTabStop.row === 1 && effectiveTabStop.col === colIndex;
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-colindex={colIndex}
                    tabIndex={isTabStop ? 0 : -1}
                    data-test-subj={`dataGridHeaderCell-${header.column.id}`}
                    data-gridcell-column-id={header.column.id}
                    css={[styles.headerCell, columnLayouts[columnIndex]]}
                  >
                    {columns[columnIndex].header}
                    {header.column.getCanResize() && (
                      <div
                        role="presentation"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onDoubleClick={() => resetColumnWidth(header.column.id)}
                        css={[
                          styles.resizeHandle,
                          header.column.getIsResizing() && styles.resizeHandleActive,
                        ]}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        {topRows.length > 0 && (
          <div data-test-subj={`${dataTestSubj}-pinnedRows`} css={styles.pinnedRows}>
            {topRows.map((tableRow, index) => {
              const ariaRowIndex = index + ariaRowIndexOffset;
              return (
                <DataGridRow
                  key={tableRow.id}
                  row={tableRow}
                  columns={columns}
                  columnLayouts={columnLayouts}
                  getCellProps={getCellProps}
                  getRowProps={getRowProps}
                  ariaRowIndex={ariaRowIndex}
                  isStriped={index % 2 === 1}
                  styles={styles}
                  tabStopColIndex={
                    effectiveTabStop.row === ariaRowIndex ? effectiveTabStop.col : undefined
                  }
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
            const tableRow = centerRows[index];
            if (!tableRow) {
              return null;
            }
            const rowIndex = topRows.length + index;
            const ariaRowIndex = rowIndex + ariaRowIndexOffset;
            return (
              <DataGridRow
                key={key}
                row={tableRow}
                columns={columns}
                columnLayouts={columnLayouts}
                getCellProps={getCellProps}
                getRowProps={getRowProps}
                ariaRowIndex={ariaRowIndex}
                isStriped={rowIndex % 2 === 1}
                styles={styles}
                tabStopColIndex={
                  effectiveTabStop.row === ariaRowIndex ? effectiveTabStop.col : undefined
                }
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
