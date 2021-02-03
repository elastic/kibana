/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { EuiDataGrid, EuiDataGridSorting, EuiDataGridProps } from '@elastic/eui';
import { VegaRuntimeData } from '../vega_adapter';

const DEFAULT_PAGE_SIZE = 15;

interface InspectorDataGridProps extends VegaRuntimeData {
  dataGridAriaLabel: string;
}

export const InspectorDataGrid = ({ columns, data, dataGridAriaLabel }: InspectorDataGridProps) => {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });
  const onChangeItemsPerPage = useCallback(
    (pageSize) => setPagination((p) => ({ ...p, pageSize, pageIndex: 0 })),
    [setPagination]
  );

  const onChangePage = useCallback((pageIndex) => setPagination((p) => ({ ...p, pageIndex })), [
    setPagination,
  ]);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  useEffect(
    () => {
      setPagination({
        ...pagination,
        pageIndex: 0,
      });
      setVisibleColumns(columns.map((column) => column.id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataGridAriaLabel]
  );

  // Sorting
  const [sortingColumns, setSortingColumns] = useState<EuiDataGridSorting['columns']>([]);

  const onSort = useCallback(
    (newSortingColumns: EuiDataGridSorting['columns']) => {
      setSortingColumns(newSortingColumns);
    },
    [setSortingColumns]
  );

  let gridData = useMemo(() => {
    return [...data].sort((a, b) => {
      for (let i = 0; i < sortingColumns.length; i++) {
        const column = sortingColumns[i];
        const aValue = a[column.id];
        const bValue = b[column.id];

        if (aValue < bValue) return column.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return column.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortingColumns]);

  const renderCellValue = useMemo(() => {
    return (({ rowIndex, columnId }) => {
      let adjustedRowIndex = rowIndex;

      // If we are doing the pagination (instead of leaving that to the grid)
      // then the row index must be adjusted as `data` has already been pruned to the page size
      adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      return gridData.hasOwnProperty(adjustedRowIndex)
        ? gridData[adjustedRowIndex][columnId] || null
        : null;
    }) as EuiDataGridProps['renderCellValue'];
  }, [gridData, pagination.pageIndex, pagination.pageSize]);

  // Pagination
  gridData = useMemo(() => {
    const rowStart = pagination.pageIndex * pagination.pageSize;
    const rowEnd = Math.min(rowStart + pagination.pageSize, gridData.length);
    return gridData.slice(rowStart, rowEnd);
  }, [gridData, pagination]);

  // Resize
  const [columnsWidth, setColumnsWidth] = useState<Record<string, number>>({});

  const onColumnResize: EuiDataGridProps['onColumnResize'] = useCallback(
    ({ columnId, width }) => {
      setColumnsWidth({
        ...columnsWidth,
        [columnId]: width,
      });
    },
    [columnsWidth]
  );

  return (
    <EuiDataGrid
      aria-label={dataGridAriaLabel}
      columns={columns.map((column) => {
        if (columnsWidth[column.id]) {
          return {
            ...column,
            initialWidth: columnsWidth[column.id],
          };
        }
        return column;
      })}
      columnVisibility={{
        visibleColumns,
        setVisibleColumns,
      }}
      rowCount={data.length}
      renderCellValue={renderCellValue}
      sorting={{ columns: sortingColumns, onSort }}
      toolbarVisibility={{
        showFullScreenSelector: false,
      }}
      onColumnResize={onColumnResize}
      pagination={{
        ...pagination,
        pageSizeOptions: [DEFAULT_PAGE_SIZE, 25, 50],
        onChangeItemsPerPage,
        onChangePage,
      }}
    />
  );
};
