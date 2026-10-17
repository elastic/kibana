/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, FocusEvent, KeyboardEvent } from 'react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnSizingState,
  type RowPinningState,
  type Table,
  type Updater,
} from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import type { EuiDataGridColumnCellAction } from '@elastic/eui';
import { EuiIconTip, useResizeObserver } from '@elastic/eui';
import type { IToasts } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { GridPosition } from '@kbn/unified-data-table';
import {
  GRID_CELL_SELECTOR,
  GRID_KEYS,
  getGridPosition,
  getNextGridPosition,
} from '@kbn/unified-data-table';
import type { FieldRow } from './field_row';
import { PinControlCell } from './get_pin_control';
import { useRestorableRef } from './restorable_state';
import { getFieldCellActions, getFieldValueCellActions } from './table_cell_actions';
import type { UseTableFiltersCallbacksReturn } from './table_filters';
import { GRID_COLUMN_FIELD_NAME, GRID_COLUMN_FIELD_VALUE } from './table_grid_constants';
import type { FieldTableData } from './tanstack_table_grid_cells';
import {
  FieldTableCell,
  FieldTableDataContext,
  GridRow,
  getColumnCss,
} from './tanstack_table_grid_cells';
import {
  ESTIMATED_ROW_HEIGHT,
  MAX_NAME_COLUMN_WIDTH,
  MIN_NAME_COLUMN_WIDTH,
  NAME_COLUMN_WIDTH_VAR,
  OVERSCAN,
  PIN_COLUMN_ID,
  PIN_COLUMN_WIDTH,
} from './tanstack_table_grid_constants';
import { componentStyles } from './tanstack_table_grid_styles';
import { getCellPositionAfterPinToggle } from './utils';

export interface TanStackTableGridProps {
  containerWidth: number;
  rows: FieldRow[];
  isEsqlMode: boolean;
  toasts: IToasts;
  filter?: DocViewFilterFn;
  onAddColumn?: (columnName: string) => void;
  onRemoveColumn?: (columnName: string) => void;
  columns?: string[];
  onFindSearchTermMatch?: UseTableFiltersCallbacksReturn['onFindSearchTermMatch'];
  searchTerm?: string;
  onTogglePinned?: (field: string) => void;
  hidePinColumn?: boolean;
  headerVisibility?: boolean;
  hideFilteringOnComputedColumns?: boolean;
}

type FieldColumnId = typeof GRID_COLUMN_FIELD_NAME | typeof GRID_COLUMN_FIELD_VALUE;

const estimateSize = () => ESTIMATED_ROW_HEIGHT;
const getRowId = (row: FieldRow) => row.name;

const getInitialNameColumnWidth = (containerWidth: number) =>
  Math.min(
    Math.max(Math.round(containerWidth * 0.3), MIN_NAME_COLUMN_WIDTH),
    MAX_NAME_COLUMN_WIDTH
  );

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * TanStack Table + Virtual based fields table, rendered as an alternative to the EuiDataGrid one.
 */
export const TanStackTableGrid = ({
  containerWidth,
  rows,
  isEsqlMode,
  toasts,
  filter,
  onAddColumn,
  onRemoveColumn,
  columns,
  onFindSearchTermMatch,
  searchTerm,
  onTogglePinned,
  hidePinColumn = false,
  headerVisibility = true,
  hideFilteringOnComputedColumns,
}: TanStackTableGridProps) => {
  const styles = useMemoCss(componentStyles);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTopRef = useRestorableRef('scrollTop', 0);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const tableRef = useRef<Table<FieldRow>>();
  const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element>>();
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  // Header and pinned rows share one sticky block, which the virtualized rows scroll below.
  const [stickyElement, setStickyElement] = useState<HTMLDivElement | null>(null);
  const { height: stickyHeight } = useResizeObserver(stickyElement, 'height');

  const onToggleColumn = useMemo(() => {
    if (!onRemoveColumn || !onAddColumn || !columns) {
      return undefined;
    }
    return (field: string) => {
      if (columns.includes(field)) {
        onRemoveColumn(field);
      } else {
        onAddColumn(field);
      }
    };
  }, [onRemoveColumn, onAddColumn, columns]);

  const fieldCellActions = useMemo<EuiDataGridColumnCellAction[]>(
    () =>
      getFieldCellActions({
        rows,
        isEsqlMode,
        onFilter: filter,
        onToggleColumn,
        columns,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, filter, onToggleColumn, columns, hideFilteringOnComputedColumns]
  );
  const fieldValueCellActions = useMemo<EuiDataGridColumnCellAction[]>(
    () =>
      getFieldValueCellActions({
        rows,
        isEsqlMode,
        toasts,
        onFilter: filter,
        hideFilteringOnComputedColumns,
      }),
    [rows, isEsqlMode, toasts, filter, hideFilteringOnComputedColumns]
  );

  // Cells read their data from context, so the column definitions below stay stable.
  const fieldTableData = useMemo<FieldTableData>(
    () => ({
      rows,
      searchTerm,
      isEsqlMode,
      onFindSearchTermMatch,
      filter,
      hideFilteringOnComputedColumns,
      fieldCellActions,
      fieldValueCellActions,
    }),
    [
      rows,
      searchTerm,
      isEsqlMode,
      onFindSearchTermMatch,
      filter,
      hideFilteringOnComputedColumns,
      fieldCellActions,
      fieldValueCellActions,
    ]
  );

  const showPinColumn = Boolean(onTogglePinned) && !hidePinColumn;

  // Pinned fields are owned by the parent (restorable + local storage), TanStack row pinning mirrors them.
  const rowPinning = useMemo<RowPinningState>(
    () => ({ top: rows.filter((row) => row.isPinned).map((row) => row.name), bottom: [] }),
    [rows]
  );

  const onRowPinningChange = useCallback(
    (updater: Updater<RowPinningState>) => {
      const prevTop = rowPinning.top ?? [];
      const nextTop = (typeof updater === 'function' ? updater(rowPinning) : updater).top ?? [];
      const toggledFields = [
        ...nextTop.filter((field) => !prevTop.includes(field)),
        ...prevTop.filter((field) => !nextTop.includes(field)),
      ];
      toggledFields.forEach((field) => onTogglePinned?.(field));
    },
    [rowPinning, onTogglePinned]
  );

  const handleTogglePinned = useCallback(
    (field: string, { isKeyboardEvent }: { isKeyboardEvent: boolean }) => {
      const tableRow = tableRef.current?.getRow(field, true);
      if (!tableRow) {
        return;
      }
      const isPinning = !tableRow.getIsPinned();
      tableRow.pin(isPinning ? 'top' : false);

      if (!isKeyboardEvent) {
        return;
      }

      // Keep keyboard focus on the toggled field. Pinned rows are always visible in the sticky
      // section, an unpinned row moves back into the virtualized rows and may need scrolling to.
      if (!isPinning) {
        const pinnedRows = rowsRef.current.filter((row) => row.isPinned);
        const restRows = rowsRef.current.filter((row) => !row.isPinned);
        const centerIndex =
          getCellPositionAfterPinToggle({ field, pinnedRows, restRows }) - (pinnedRows.length - 1);
        if (centerIndex >= 0) {
          virtualizerRef.current?.scrollToIndex(centerIndex);
        }
      }
      requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelector<HTMLElement>(
            `[data-test-subj="unifiedDocViewer_pinControlButton_${CSS.escape(field)}"]`
          )
          ?.focus();
      });
    },
    []
  );

  const tableColumns = useMemo<Array<ColumnDef<FieldRow>>>(() => {
    const renderFieldCell =
      (columnId: FieldColumnId, colIndex: number) =>
      ({ row }: { row: { index: number } }) =>
        <FieldTableCell rowIndex={row.index} colIndex={colIndex} columnId={columnId} />;
    const colOffset = showPinColumn ? 1 : 0;

    return [
      ...(showPinColumn
        ? [
            {
              id: PIN_COLUMN_ID,
              size: PIN_COLUMN_WIDTH,
              enableResizing: false,
              header: () => {
                const pinColumnHeader = i18n.translate(
                  'unifiedDocViewer.fieldsTable.pinControlColumnHeader',
                  { defaultMessage: 'Pin field column' }
                );
                return (
                  <EuiIconTip
                    aria-label={pinColumnHeader}
                    type="info"
                    content={pinColumnHeader}
                    // Like EuiDataGrid, header content is not a separate tab stop.
                    iconProps={{ tabIndex: -1 }}
                  />
                );
              },
              cell: ({ row }: { row: { original: FieldRow } }) => (
                <PinControlCell row={row.original} onTogglePinned={handleTogglePinned} />
              ),
            },
          ]
        : []),
      {
        id: GRID_COLUMN_FIELD_NAME,
        minSize: MIN_NAME_COLUMN_WIDTH,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.name', {
          defaultMessage: 'Field',
        }),
        cell: renderFieldCell(GRID_COLUMN_FIELD_NAME, colOffset),
      },
      {
        id: GRID_COLUMN_FIELD_VALUE,
        enableResizing: false,
        header: i18n.translate('unifiedDocViewer.fieldChooser.discoverField.value', {
          defaultMessage: 'Value',
        }),
        cell: renderFieldCell(GRID_COLUMN_FIELD_VALUE, colOffset + 1),
      },
    ];
  }, [showPinColumn, handleTogglePinned]);

  // The name column follows the container width until the user resizes it.
  const tableColumnSizing = useMemo<ColumnSizingState>(
    () => ({
      [GRID_COLUMN_FIELD_NAME]: getInitialNameColumnWidth(containerWidth),
      ...columnSizing,
    }),
    [containerWidth, columnSizing]
  );

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId,
    columnResizeMode: 'onChange',
    enableRowPinning: showPinColumn,
    // Pinned fields are never filtered out by the fields search, see `DocViewerTable`.
    keepPinnedRows: true,
    state: { columnSizing: tableColumnSizing, rowPinning },
    onColumnSizingChange: setColumnSizing,
    onRowPinningChange,
  });
  tableRef.current = table;

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();

  // Must be stable: a new function makes the virtualizer rebuild all row measurements.
  const getItemKey = useCallback((index: number) => centerRows[index]?.id ?? index, [centerRows]);

  const rowVirtualizer = useVirtualizer({
    count: centerRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: scrollTopRef.current,
    getItemKey,
    scrollMargin: stickyHeight,
    scrollPaddingStart: stickyHeight,
  });
  virtualizerRef.current = rowVirtualizer;

  const onScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollTopRef.current = scrollRef.current.scrollTop;
    }
  }, [scrollTopRef]);

  const nameColumnWidth = tableColumnSizing[GRID_COLUMN_FIELD_NAME];
  const containerStyle = useMemo(
    // CSS custom properties are not part of React's CSSProperties type.
    () => ({ [NAME_COLUMN_WIDTH_VAR]: `${nameColumnWidth}px` } as CSSProperties),
    [nameColumnWidth]
  );

  const virtualItems = rowVirtualizer.getVirtualItems();
  const ariaRowIndexOffset = headerVisibility ? 2 : 1;
  const colCount = tableColumns.length;
  const firstRow = headerVisibility ? 1 : ariaRowIndexOffset;
  const lastRow = Math.max(rows.length + ariaRowIndexOffset - 1, firstRow);
  // aria-rowindex of the first virtualized row.
  const centerStartRow = topRows.length + ariaRowIndexOffset;

  // Roving tabindex: the grid is a single tab stop, arrow keys move between its cells.
  const [tabStop, setTabStop] = useState<GridPosition>({
    row: ariaRowIndexOffset,
    col: showPinColumn ? 2 : 1,
  });
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
      virtualizerRef.current?.scrollToIndex(centerIndex);
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
    [centerStartRow, centerRows.length]
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
    <FieldTableDataContext.Provider value={fieldTableData}>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        tabIndex={-1}
        role="grid"
        aria-rowcount={rows.length + (headerVisibility ? 1 : 0)}
        aria-colcount={colCount}
        aria-label={i18n.translate('unifiedDocViewer.fieldsTable.ariaLabel', {
          defaultMessage: 'Field values',
        })}
        data-test-subj="UnifiedDocViewerTableGrid"
        className="kbnDocViewer__fieldsGrid"
        css={styles.scrollContainer}
        style={containerStyle}
      >
        <div ref={setStickyElement} css={styles.stickyTop}>
          {headerVisibility &&
            table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} role="row" aria-rowindex={1} css={styles.headerRow}>
                {headerGroup.headers.map((header) => {
                  const colIndex = header.column.getIndex() + 1;
                  const isTabStop = effectiveTabStop.row === 1 && effectiveTabStop.col === colIndex;
                  return (
                    <div
                      key={header.id}
                      role="columnheader"
                      aria-colindex={colIndex}
                      tabIndex={isTabStop ? 0 : -1}
                      data-test-subj={`dataGridHeaderCell-${header.column.id}`}
                      data-gridcell-column-id={header.column.id}
                      css={[styles.headerCell, getColumnCss(styles, header.column.id)]}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanResize() && (
                        <div
                          role="presentation"
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
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
            <div data-test-subj="unifiedDocViewerPinnedFields" css={styles.pinnedRows}>
              {topRows.map((tableRow, index) => {
                const ariaRowIndex = index + ariaRowIndexOffset;
                return (
                  <GridRow
                    key={tableRow.id}
                    row={tableRow}
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
                <GridRow
                  key={key}
                  row={tableRow}
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
    </FieldTableDataContext.Provider>
  );
};
