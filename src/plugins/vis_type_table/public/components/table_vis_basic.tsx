/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiDataGrid, EuiDataGridSorting, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { createTableVisCell } from './table_vis_cell';
import { Table } from '../table_vis_response_handler';
import { TableVisConfig, TableVisUiState } from '../types';
import { useFormattedColumnsAndRows, usePagination } from '../utils';
import { TableVisControls } from './table_vis_controls';
import { createGridColumns } from './table_vis_columns';

interface TableVisBasicProps {
  fireEvent: IInterpreterRenderHandlers['event'];
  setSort: (s?: TableVisUiState['sort']) => void;
  sort: TableVisUiState['sort'];
  table: Table;
  visConfig: TableVisConfig;
  title?: string;
}

export const TableVisBasic = memo(
  ({ fireEvent, setSort, sort, table, visConfig, title }: TableVisBasicProps) => {
    const { columns, rows } = useFormattedColumnsAndRows(table, visConfig);

    // custom sorting is in place until the EuiDataGrid sorting gets rid of flaws -> https://github.com/elastic/eui/issues/4108
    const sortedRows = useMemo(
      () =>
        sort.columnIndex !== null && sort.direction
          ? orderBy(rows, columns[sort.columnIndex]?.id, sort.direction)
          : rows,
      [rows, sort]
    );

    // renderCellValue is a component which renders a cell based on column and row indexes
    const renderCellValue = useMemo(() => createTableVisCell(columns, sortedRows), [
      columns,
      sortedRows,
    ]);

    // Columns config
    const gridColumns = useMemo(() => createGridColumns(table, columns, sortedRows, fireEvent), [
      table,
      columns,
      sortedRows,
      fireEvent,
    ]);

    // Pagination config
    const pagination = usePagination(visConfig);
    // Sorting config
    const sortingColumns = useMemo(
      () =>
        sort.columnIndex !== null && sort.direction
          ? [{ id: columns[sort.columnIndex]?.id, direction: sort.direction }]
          : [],
      [sort]
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

    const ariaLabel =
      title ||
      visConfig.title ||
      i18n.translate('visTypeTable.defaultAriaLabel', {
        defaultMessage: 'Data table visualization',
      });

    return (
      <>
        {title && (
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        )}
        <EuiDataGrid
          aria-label={ariaLabel}
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
              additionalControls: (
                <TableVisControls
                  cols={columns}
                  rows={rows}
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
        />
      </>
    );
  }
);
