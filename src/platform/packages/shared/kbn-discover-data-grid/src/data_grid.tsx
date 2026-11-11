/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { useEuiMemoizedStyles } from '@elastic/eui';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { DataGridColumn } from './data_grid_column';
import { getDataGridColumnValue, renderDataGridCell } from './data_grid_column';
import { DEFAULT_DATA_GRID_ROW_HEIGHT, getDataGridStyles } from './data_grid.styles';

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
  className?: string;
}

export const DataGrid = <TRow extends object>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  height,
  virtualization,
  className,
}: DataGridProps<TRow>): React.ReactElement => {
  const styles = useEuiMemoizedStyles(getDataGridStyles);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    estimatedHeight: estimatedRowHeight = DEFAULT_DATA_GRID_ROW_HEIGHT,
    overscan: rowOverscan = DEFAULT_OVERSCAN,
  } = virtualization?.rows ?? {};

  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<typeof tableFeatureSet, TRow>();
    return columnHelper.columns(
      columns.map((column) =>
        columnHelper.accessor((row) => getDataGridColumnValue(column, row), {
          id: column.id,
          header: () => column.header,
          cell: (cellContext) => {
            const { row } = cellContext;
            return renderDataGridCell(
              column,
              {
                row: row.original,
                rowId: row.id,
                columnId: column.id,
                displayIndex: row.getDisplayIndex(),
              },
              cellContext.getValue()
            );
          },
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

  const headerGroups = table.getHeaderGroups();
  const tableRows = table.getRowModel().rows;
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
    initialRect: { width: 0, height },
  });

  const gridTemplateColumns =
    columns.length > 0 ? `repeat(${columns.length}, minmax(0, 1fr))` : 'none';

  return (
    <div
      ref={scrollContainerRef}
      role="grid"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-colcount={columns.length}
      aria-rowcount={rows.length + headerGroups.length}
      className={className}
      css={styles.grid}
      style={{ blockSize: height }}
    >
      {headerGroups.map((headerGroup, headerGroupIndex) => (
        <div
          key={headerGroup.id}
          role="row"
          aria-rowindex={headerGroupIndex + 1}
          css={styles.headerRow}
          style={{ gridTemplateColumns }}
        >
          {headerGroup.headers.map((header) => {
            const column = columns.find(({ id }) => id === header.column.id);
            return (
              <div
                key={header.id}
                role="columnheader"
                aria-label={column?.accessibilityLabel}
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

      <div
        role="rowgroup"
        css={styles.virtualCanvas}
        style={{ blockSize: rowVirtualizer.getTotalSize() }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = tableRows[virtualRow.index];
          if (!row) {
            return null;
          }

          return (
            <div
              key={row.id}
              ref={rowVirtualizer.measureElement}
              role="row"
              aria-rowindex={headerGroups.length + virtualRow.index + 1}
              data-index={virtualRow.index}
              data-striped={virtualRow.index % 2 === 1}
              css={styles.row}
              style={{
                gridTemplateColumns,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {row.getAllCells().map((cell) => (
                <div key={cell.id} role="gridcell" css={styles.cell}>
                  <table.FlexRender cell={cell} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
