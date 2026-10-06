/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect } from 'react';
import type { Row } from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { useEuiTheme } from '@elastic/eui';
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
      isExpanded: boolean;
      isSelected: boolean;
      indicatorColor: string | undefined;
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
      isExpanded,
      isSelected,
      indicatorColor,
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
        css={[
          styles.row,
          isAutoHeight && styles.rowAutoHeight,
          isExpanded && styles.rowExpanded,
          isSelected && styles.selectedRow,
          indicatorColor && styles.rowWithIndicator,
        ]}
        style={{
          height: isAutoHeight ? undefined : rowHeight,
          ...(indicatorColor
            ? ({ ['--tsg-row-indicator-color' as string]: indicatorColor } as React.CSSProperties)
            : undefined),
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

export type RowVirtualizer = Virtualizer<HTMLDivElement, Element>;

interface TanStackGridBodyProps {
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  virtualizerRef: React.MutableRefObject<RowVirtualizer | null>;
  header: React.ReactNode;
  overlay: React.ReactNode;
  tableRows: Array<Row<DataTableRecord>>;
  rowHeight: number;
  isAutoRowHeight: boolean;
  scrollKey: string;
  totalWidth: number | '100%';
  styles: ReturnType<typeof getTanStackDataGridStyles>;
  selectedRows: Set<string>;
  expandedDocId: string | undefined;
  getRowIndicator?: UnifiedDataTableProps['getRowIndicator'];
  focusedCell: { row: number; col: number } | null;
  onFilter?: UnifiedDataTableProps['onFilter'];
  setPopoverState: SetCellPopoverState;
  findTerm: string;
  findActiveMatch: FindMatch | null;
  getColumnStyle: TanStackColumnLayout['getColumnStyle'];
  colCount: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
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
  rowHeight,
  isAutoRowHeight,
  scrollKey,
  totalWidth,
  styles,
  selectedRows,
  expandedDocId,
  getRowIndicator,
  focusedCell,
  onFilter,
  setPopoverState,
  findTerm,
  findActiveMatch,
  getColumnStyle,
  colCount,
  onKeyDown,
}: TanStackGridBodyProps) {
  const { euiTheme } = useEuiTheme();
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  // Must be stable: a new function invalidates the virtualizer's measurement cache every render.
  const getItemKey = useCallback(
    (index: number) => tableRows[index]?.original.id ?? index,
    [tableRows]
  );

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
    getItemKey,
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
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
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
                isExpanded={expandedDocId === record.id}
                isSelected={selectedRows.has(record.id)}
                indicatorColor={getRowIndicator?.(record, euiTheme)?.color}
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
