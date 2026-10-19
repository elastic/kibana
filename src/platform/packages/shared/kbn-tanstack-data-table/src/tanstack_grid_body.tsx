/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { Header, HeaderGroup, Row } from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { getTanStackDataGridStyles } from './tanstack_data_grid.styles';
import type { TanStackColumnLayout } from './tanstack_column_layout';
import type { SetCellPopoverState } from './tanstack_grid_cell_actions';
import { VirtualCell } from './tanstack_grid_cell';

const OVERSCAN = 5;
export const scrollPositionCache = new Map<string, number>();

export interface FindMatch {
  rowIndex: number;
  fieldName: string;
}

// ── Memoized virtual row ──
const VirtualRow = React.memo(
  React.forwardRef<
    HTMLDivElement,
    {
      row: Row<DataTableRecord>;
      rowIndex: number;
      /** Offset of the current page, so `data-grid-row-index` matches UnifiedDataTable. */
      rowIndexOffset: number;
      /** Only used to re-render memoized rows when cell renderers change (e.g. JSON mode settings). */
      columnDefs: unknown;
      isExpanded: boolean;
      isSelected: boolean;
      rowHeight: number;
      isAutoHeight: boolean;
      styles: ReturnType<typeof getTanStackDataGridStyles>;
      focusedColIndex: number | null;
      onFilter?: UnifiedDataTableProps['onFilter'];
      setPopoverState: SetCellPopoverState;
      findTerm?: string;
      /** Column id of the active find match when it is in this row. */
      findActiveColumnId?: string;
      getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    }
  >(function VirtualRow(
    {
      row,
      rowIndex,
      rowIndexOffset,
      isExpanded,
      isSelected,
      rowHeight,
      isAutoHeight,
      styles,
      focusedColIndex,
      onFilter,
      setPopoverState,
      findTerm,
      findActiveColumnId,
      getColumnStyle,
    },
    ref
  ) {
    const cells = row.getVisibleCells();
    return (
      <div
        ref={ref}
        data-index={rowIndex}
        data-grid-row-index={rowIndexOffset + rowIndex}
        data-grid-visible-row-index={rowIndex}
        css={[
          styles.row,
          isAutoHeight && styles.rowAutoHeight,
          isExpanded && styles.rowExpanded,
          isSelected && styles.selectedRow,
          row.original.isAnchor && styles.anchorRow,
        ]}
        style={{
          height: isAutoHeight ? undefined : rowHeight,
        }}
        role="row"
        aria-rowindex={rowIndex + 2}
        aria-selected={isSelected}
        tabIndex={-1}
      >
        {cells.map((cell, colIdx) => {
          const meta = cell.column.columnDef.meta;
          return (
            <VirtualCell
              key={cell.id}
              cell={cell}
              gridCellAttributes={{
                'data-test-subj': 'dataGridRowCell',
                'data-gridcell-column-id': cell.column.id,
                'data-gridcell-column-index': colIdx,
                'data-gridcell-row-index': rowIndexOffset + rowIndex,
                'data-gridcell-visible-row-index': rowIndex,
              }}
              styles={styles}
              isFocused={focusedColIndex === colIdx}
              isAutoHeight={isAutoHeight}
              onFilter={onFilter}
              setPopoverState={setPopoverState}
              findTerm={findTerm}
              isActiveMatch={findActiveColumnId === cell.column.id}
              getColumnStyle={getColumnStyle}
              isRowSelected={Boolean(meta?.isSelect) && isSelected}
              isRowExpanded={Boolean(meta?.isControl) && isExpanded}
            />
          );
        })}
      </div>
    );
  })
);
VirtualRow.displayName = 'VirtualRow';

/** The part of a row virtualizer the grid body uses, so rows can also be virtualized by a parent. */
export interface RowVirtualizer {
  getVirtualItems: () => VirtualItem[];
  getTotalSize: () => number;
  measureElement: (element: Element | null) => void;
  measure: () => void;
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
  /** Offset of the first row in the scroll element, when rows scroll with a parent element. */
  scrollMargin: number;
}

export interface UseRowVirtualizerParams {
  rows: Array<Row<DataTableRecord>>;
  estimateSize: () => number;
  getItemKey: (index: number) => string | number;
  overscan: number;
  initialOffset: number;
  /** The grid body, which scrolls the rows unless a parent element does. */
  scrollElementRef: React.MutableRefObject<HTMLDivElement | null>;
  isFullScreen: boolean;
}

export type UseRowVirtualizer = (params: UseRowVirtualizerParams) => RowVirtualizer;

/** Virtualizes the rows within the grid body itself. */
export const useGridBodyRowVirtualizer: UseRowVirtualizer = ({
  rows,
  estimateSize,
  getItemKey,
  overscan,
  initialOffset,
  scrollElementRef,
}) => {
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize,
    overscan,
    initialOffset,
    getItemKey,
  });
  // The virtualizer instance is stable; methods read its current state.
  return useMemo(
    () => ({
      getVirtualItems: () => virtualizer.getVirtualItems(),
      getTotalSize: () => virtualizer.getTotalSize(),
      measureElement: virtualizer.measureElement,
      measure: () => virtualizer.measure(),
      scrollToIndex: (index, options) => virtualizer.scrollToIndex(index, options),
      scrollMargin: 0,
    }),
    [virtualizer]
  );
};

/** Props of the grid body; another body (see the grid's `gridBody` prop) gets the same props. */
export interface TanStackGridBodyProps {
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  virtualizerRef: React.MutableRefObject<RowVirtualizer | null>;
  header: React.ReactNode;
  /** Header cells, for bodies that render header cells inside their own header row. */
  headerGroups: Array<HeaderGroup<DataTableRecord>>;
  renderHeaderCell: (
    header: Header<DataTableRecord, unknown>,
    options?: { embedded?: boolean }
  ) => React.ReactNode;
  /** Fixed header row height; undefined for auto height. */
  headerRowHeight: number | undefined;
  overlay: React.ReactNode;
  tableRows: Array<Row<DataTableRecord>>;
  /** Absolute index of the first row on the current page. */
  rowIndexOffset: number;
  columnDefs: unknown;
  rowHeight: number;
  isAutoRowHeight: boolean;
  scrollKey: string;
  totalWidth: number | '100%';
  styles: ReturnType<typeof getTanStackDataGridStyles>;
  selectedRows: Set<string>;
  expandedDocId: string | undefined;
  focusedCell: { row: number; col: number } | null;
  onFilter?: UnifiedDataTableProps['onFilter'];
  setPopoverState: SetCellPopoverState;
  findTerm: string;
  findActiveMatch: FindMatch | null;
  getColumnStyle: TanStackColumnLayout['getColumnStyle'];
  colCount: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
  useRowVirtualizer: UseRowVirtualizer;
  isFullScreen: boolean;
}

/**
 * Owns the row virtualizer so scroll-driven re-renders stay inside the grid body
 * instead of re-rendering the toolbar, header chrome, pagination, and footer.
 */
export const TanStackGridBody = React.memo(function TanStackGridBody({
  scrollRef,
  virtualizerRef,
  header,
  overlay,
  tableRows,
  rowIndexOffset,
  columnDefs,
  rowHeight,
  isAutoRowHeight,
  scrollKey,
  totalWidth,
  styles,
  selectedRows,
  expandedDocId,
  focusedCell,
  onFilter,
  setPopoverState,
  findTerm,
  findActiveMatch,
  getColumnStyle,
  colCount,
  onKeyDown,
  useRowVirtualizer,
  isFullScreen,
}: TanStackGridBodyProps) {
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  // Must be stable: a new function invalidates the virtualizer's measurement cache every render.
  const getItemKey = useCallback(
    (index: number) => tableRows[index]?.original.id ?? index,
    [tableRows]
  );

  const rowVirtualizer = useRowVirtualizer({
    rows: tableRows,
    estimateSize,
    getItemKey,
    overscan: OVERSCAN,
    initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
    scrollElementRef: scrollRef,
    isFullScreen,
  });
  virtualizerRef.current = rowVirtualizer;

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, isAutoRowHeight, rowVirtualizer]);

  useEffect(() => {
    if (findActiveMatch) {
      rowVirtualizer.scrollToIndex(findActiveMatch.rowIndex, { align: 'center' });
    }
  }, [findActiveMatch, rowVirtualizer]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      css={styles.scrollContainer}
      data-test-subj="euiDataGridBody"
      role="grid"
      aria-rowcount={tableRows.length + 1}
      aria-colcount={colCount}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {header}

      {/* Virtual body */}
      <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
        <div
          css={styles.virtualInner}
          style={{
            transform: `translateY(${
              (virtualItems[0]?.start ?? rowVirtualizer.scrollMargin) - rowVirtualizer.scrollMargin
            }px)`,
            width: totalWidth,
          }}
        >
          {virtualItems.map(({ index }) => {
            const row = tableRows[index];
            const record = row.original;

            return (
              <VirtualRow
                key={row.id}
                // Fixed-height rows never change size, so skip per-row ResizeObserver measuring.
                ref={isAutoRowHeight ? rowVirtualizer.measureElement : undefined}
                row={row}
                rowIndex={index}
                rowIndexOffset={rowIndexOffset}
                columnDefs={columnDefs}
                isExpanded={expandedDocId === record.id}
                isSelected={selectedRows.has(record.id)}
                rowHeight={rowHeight}
                isAutoHeight={isAutoRowHeight}
                styles={styles}
                focusedColIndex={focusedCell?.row === index ? focusedCell.col : null}
                onFilter={onFilter}
                setPopoverState={setPopoverState}
                findTerm={findTerm}
                findActiveColumnId={
                  findActiveMatch?.rowIndex === index ? findActiveMatch.fieldName : undefined
                }
                getColumnStyle={getColumnStyle}
              />
            );
          })}
        </div>
      </div>

      {overlay}
    </div>
  );
});
