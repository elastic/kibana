/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiDataGrid, EuiDataGridProps, EuiDataGridSorting, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisConfig, TableVisUseUiStateProps } from '../types';
import { useFormattedColumnsAndRows, usePagination } from '../utils';
import { TableVisControls } from './table_vis_controls';
import { createGridColumns } from './table_vis_columns';

interface TableVisBasicProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  table: Table;
  visConfig: TableVisConfig;
  title?: string;
  uiStateProps: TableVisUseUiStateProps;
}

export const TableVisBasic = memo(
  ({
    fireEvent,
    table,
    visConfig,
    title,
    uiStateProps: { columnsWidth, sort, setColumnsWidth, setSort },
  }: TableVisBasicProps) => {
    const { columns, rows } = useFormattedColumnsAndRows(table, visConfig);

    // custom sorting is in place until the EuiDataGrid sorting gets rid of flaws -> https://github.com/elastic/eui/issues/4108
    const sortedRows = useMemo(
      () =>
        sort.columnIndex !== null && sort.direction
          ? orderBy(rows, columns[sort.columnIndex]?.id, sort.direction)
          : rows,
      [columns, rows, sort]
    );

    // renderCellValue is a component which renders a cell based on column and row indexes
    const renderCellValue = useMemo(() => createTableVisCell(columns, sortedRows), [
      columns,
      sortedRows,
    ]);

    // Columns config
    const gridColumns = createGridColumns(table, columns, columnsWidth, sortedRows, fireEvent);

    // Pagination config
    const pagination = usePagination(visConfig, rows.length);
    // Sorting config
    const sortingColumns = useMemo(
      () =>
        sort.columnIndex !== null && sort.direction
          ? [{ id: columns[sort.columnIndex]?.id, direction: sort.direction }]
          : [],
      [columns, sort]
    );
    const onSort = useCallback(
      (sortingCols: EuiDataGridSorting['columns'] | []) => {
        // data table vis sorting now only handles one column sorting
        // if data grid provides more columns to sort, pick only the next column to sort
        const newSortValue = sortingCols.length <= 1 ? sortingCols[0] : sortingCols[1];
        setSort(
          newSortValue && {
            columnIndex: columns.findIndex((c) => c.id === newSortValue.id),
            direction: newSortValue.direction,
          }
        );
      },
      [columns, setSort]
    );

    const dataGridAriaLabel =
      title ||
      visConfig.title ||
      i18n.translate('visTypeTable.defaultAriaLabel', {
        defaultMessage: 'Data table visualization',
      });

    const onColumnResize: EuiDataGridProps['onColumnResize'] = useCallback(
      ({ columnId, width }) => {
        const colIndex = columns.findIndex((c) => c.id === columnId);
        setColumnsWidth({
          colIndex,
          width,
        });
      },
      [columns, setColumnsWidth]
    );

    return (
      <>
        {title && (
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        )}
        <EuiDataGrid
          aria-label={dataGridAriaLabel}
          columns={gridColumns}
          gridStyle={{
            border: 'horizontal',
            header: 'underline',
          }}
          rowCount={rows.length}
          columnVisibility={{
            visibleColumns: columns.map(({ id }) => id),
            setVisibleColumns: () => {},
          }}
          toolbarVisibility={
            visConfig.showToolbar && {
              showColumnSelector: false,
              showFullScreenSelector: false,
              showSortSelector: false,
              showStyleSelector: false,
              additionalControls: (
                <TableVisControls
                  dataGridAriaLabel={dataGridAriaLabel}
                  cols={columns}
                  // csv exports sorted table
                  rows={sortedRows}
                  table={table}
                  filename={visConfig.title}
                />
              ),
            }
          }
          renderCellValue={renderCellValue}
          renderFooterCellValue={
            visConfig.showTotal
              ? // @ts-expect-error
                ({ colIndex }) => columns[colIndex].formattedTotal || null
              : undefined
          }
          pagination={pagination}
          sorting={{ columns: sortingColumns, onSort }}
          onColumnResize={onColumnResize}
          minSizeForControls={1}
        />
      </>
    );
  }
);
