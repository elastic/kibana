/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useEuiMemoizedStyles, useResizeObserver } from '@elastic/eui';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { DataGridApi } from './data_grid_api';
import { useDataGridAnnouncements } from './data_grid_announcements';
import { DataGridCell } from './data_grid_cell';
import type { DataGridColumn } from './data_grid_column';
import { getDataGridColumnValue } from './data_grid_column';
import { DEFAULT_DATA_GRID_ROW_HEIGHT, getDataGridStyles } from './data_grid.styles';
import { useDataGridFocus } from './use_data_grid_focus';

const tableFeatureSet = tableFeatures({});

const DEFAULT_OVERSCAN = 5;

export interface DataGridVirtualizationOptions {
  readonly rows?: {
    readonly estimatedHeight?: number;
    readonly overscan?: number;
  };
}

export interface DataGridProps<TRow extends object> {
  ariaLabel: string;
  columns: ReadonlyArray<DataGridColumn<TRow>>;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  height: number;
  virtualization?: DataGridVirtualizationOptions;
  apiRef?: React.Ref<DataGridApi | null>;
  className?: string;
}

const assertUniqueIds = (ids: readonly string[], subject: string): void => {
  const seenIds = new Set<string>();
  for (const id of ids) {
    if (id.length === 0) {
      throw new Error(`Data grid ${subject} IDs must not be empty.`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Data grid ${subject} ID "${id}" must be unique.`);
    }
    seenIds.add(id);
  }
};

export const DataGrid = <TRow extends object>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  height,
  virtualization,
  apiRef,
  className,
}: DataGridProps<TRow>): React.ReactElement => {
  if (ariaLabel.trim().length === 0) {
    throw new Error('DataGrid requires a non-empty accessible name.');
  }

  const styles = useEuiMemoizedStyles(getDataGridStyles);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [headerRowGroupElement, setHeaderRowGroupElement] = useState<HTMLDivElement | null>(null);
  const { height: headerHeight } = useResizeObserver(headerRowGroupElement);
  const {
    estimatedHeight: estimatedRowHeight = DEFAULT_DATA_GRID_ROW_HEIGHT,
    overscan: rowOverscan = DEFAULT_OVERSCAN,
  } = virtualization?.rows ?? {};

  const columnIds = useMemo(() => {
    const ids = columns.map(({ id, accessibilityLabel }) => {
      if (accessibilityLabel.trim().length === 0) {
        throw new Error(`Data grid column "${id}" requires a non-empty accessibility label.`);
      }
      return id;
    });
    assertUniqueIds(ids, 'column');
    return ids;
  }, [columns]);
  const columnsById = useMemo(
    () => new Map(columns.map((column) => [column.id, column] as const)),
    [columns]
  );

  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<typeof tableFeatureSet, TRow>();
    return columnHelper.columns(
      columns.map((column) =>
        columnHelper.accessor((row) => getDataGridColumnValue(column, row), {
          id: column.id,
          header: () => column.header,
        })
      )
    );
  }, [columns]);

  const table = useTable({
    features: tableFeatureSet,
    columns: tableColumns,
    data: rows,
    getRowId,
  });

  const tableRows = table.getRowModel().rows;
  const rowIds = useMemo(() => {
    const ids = tableRows.map(({ id }) => id);
    assertUniqueIds(ids, 'row');
    return ids;
  }, [tableRows]);
  const getVirtualItemKey = useCallback(
    (index: number): string => {
      const row = tableRows[index];
      if (!row) {
        throw new Error(`Cannot resolve the data grid row at index ${index}.`);
      }
      return row.id;
    },
    [tableRows]
  );
  const estimateRowSize = useCallback(() => estimatedRowHeight, [estimatedRowHeight]);

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: estimateRowSize,
    getItemKey: getVirtualItemKey,
    overscan: rowOverscan,
    scrollMargin: headerHeight,
    scrollPaddingStart: headerHeight,
    initialRect: { width: 0, height },
  });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const scrollToRow = useCallback(
    (rowIndex: number): boolean => {
      try {
        const offset = rowVirtualizer.getOffsetForIndex(rowIndex, 'auto')?.[0];
        if (offset === undefined) {
          return false;
        }
        rowVirtualizer.scrollToOffset(offset);
        return true;
      } catch {
        return false;
      }
    },
    [rowVirtualizer]
  );

  const {
    liveRegion,
    announceCopySuccess,
    announceCopyFailure,
    announceCommandFailure,
    announceRowsBecameEmpty,
  } = useDataGridAnnouncements();
  const focus = useDataGridFocus({
    rowIds,
    columnIds,
    gridRef: scrollContainerRef,
    scrollToRow,
    onCommandFailure: announceCommandFailure,
    onRowsBecameEmpty: announceRowsBecameEmpty,
  });
  useImperativeHandle(apiRef, () => focus.api, [focus.api]);

  const activeRowIsMounted = Boolean(
    focus.activeCell &&
      virtualRows.some(({ index }) => tableRows[index]?.id === focus.activeCell?.rowId)
  );
  const gridTemplateColumns =
    columns.length > 0 ? `repeat(${columns.length}, minmax(0, 1fr))` : 'none';
  const onGridFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget &&
        focus.activeCell &&
        rowIds.includes(focus.activeCell.rowId) &&
        columnIds.includes(focus.activeCell.columnId)
      ) {
        void focus.focusCell(focus.activeCell);
      }
    },
    [columnIds, focus, rowIds]
  );

  return (
    <>
      <div
        ref={scrollContainerRef}
        role="grid"
        tabIndex={focus.activeCell && activeRowIsMounted ? -1 : 0}
        aria-label={ariaLabel}
        aria-colcount={columns.length}
        aria-rowcount={tableRows.length}
        className={className}
        css={styles.grid}
        style={{ blockSize: height, scrollPaddingBlockStart: headerHeight }}
        onFocus={onGridFocus}
      >
        <div ref={setHeaderRowGroupElement} role="rowgroup" css={styles.headerRowGroup}>
          {table.getHeaderGroups().map((headerGroup) => (
            <div
              key={headerGroup.id}
              role="row"
              css={styles.headerRow}
              style={{ gridTemplateColumns }}
            >
              {headerGroup.headers.map((header, columnIndex) => {
                const column = columnsById.get(header.column.id);
                if (!column) {
                  throw new Error(`Cannot resolve data grid column "${header.column.id}".`);
                }
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-colindex={columnIndex + 1}
                    aria-label={column.accessibilityLabel}
                    css={styles.headerCell}
                  >
                    {header.isPlaceholder ? null : (
                      <div css={styles.headerContent}>
                        <table.FlexRender header={header} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div
          role="rowgroup"
          css={styles.virtualCanvas}
          style={{ blockSize: rowVirtualizer.getTotalSize() }}
        >
          {virtualRows.map((virtualRow) => {
            const row = tableRows[virtualRow.index];
            if (!row) {
              throw new Error(`Cannot render the data grid row at index ${virtualRow.index}.`);
            }

            return (
              <div
                key={row.id}
                ref={rowVirtualizer.measureElement}
                role="row"
                aria-rowindex={virtualRow.index + 1}
                data-index={virtualRow.index}
                data-striped={virtualRow.index % 2 === 1}
                css={styles.row}
                style={{
                  gridTemplateColumns,
                  transform: `translateY(${virtualRow.start - headerHeight}px)`,
                }}
              >
                {row.getAllCells().map((cell, columnIndex) => {
                  const column = columnsById.get(cell.column.id);
                  if (!column) {
                    throw new Error(`Cannot resolve data grid column "${cell.column.id}".`);
                  }
                  const address = { rowId: row.id, columnId: column.id };
                  return (
                    <DataGridCell
                      key={cell.id}
                      address={address}
                      row={row.original}
                      displayIndex={row.getDisplayIndex()}
                      column={column}
                      value={cell.getValue()}
                      columnIndex={columnIndex}
                      rowIds={rowIds}
                      columnIds={columnIds}
                      activeCell={focus.activeCell}
                      interactionCell={focus.interactionCell}
                      cellStyles={styles.cell}
                      focusCell={focus.focusCell}
                      registerCell={focus.registerCell}
                      registerInteractionTarget={focus.registerInteractionTarget}
                      enterNavigationMode={focus.enterNavigationMode}
                      enterInteractionMode={focus.enterInteractionMode}
                      deactivateInteractionMode={focus.deactivateInteractionMode}
                      leaveInteractionMode={focus.leaveInteractionMode}
                      announceCopySuccess={announceCopySuccess}
                      announceCopyFailure={announceCopyFailure}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {liveRegion}
    </>
  );
};
