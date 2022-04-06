/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiDataGridColumnCellActionProps, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { DatatableColumn, DatatableRow, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { FormattedColumns, TableVisUiState } from '../types';

interface FilterCellData {
  /**
   * Row index
   */
  row: number;
  /**
   * Column index
   */
  column: number;
  value: unknown;
}

export const createGridColumns = (
  columns: DatatableColumn[],
  rows: DatatableRow[],
  formattedColumns: FormattedColumns,
  columnsWidth: TableVisUiState['colWidth'],
  fireEvent: IInterpreterRenderHandlers['event'],
  closeCellPopover?: Function
) => {
  const onFilterClick = (data: FilterCellData, negate: boolean) => {
    fireEvent({
      name: 'filterBucket',
      data: {
        data: [
          {
            table: {
              columns,
              rows,
            },
            ...data,
            column: data.column,
          },
        ],
        negate,
      },
    });
  };

  return columns.map((col, colIndex): EuiDataGridColumn => {
    const formattedColumn = formattedColumns[col.id];
    const cellActions = formattedColumn.filterable
      ? [
          ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
            const rowValue = rows[rowIndex][columnId];
            const contentsIsDefined = rowValue !== null && rowValue !== undefined;
            const cellContent = formattedColumn.formatter.convert(rowValue);

            const filterForText = i18n.translate(
              'visTypeTable.tableCellFilter.filterForValueText',
              {
                defaultMessage: 'Filter for value',
              }
            );
            const filterForAriaLabel = i18n.translate(
              'visTypeTable.tableCellFilter.filterForValueAriaLabel',
              {
                defaultMessage: 'Filter for value: {cellContent}',
                values: {
                  cellContent,
                },
              }
            );

            return (
              contentsIsDefined && (
                <Component
                  aria-label={filterForAriaLabel}
                  data-test-subj="tbvChartCell__filterForCellValue"
                  onClick={() => {
                    onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, false);
                    closeCellPopover?.();
                  }}
                  iconType="plusInCircle"
                >
                  {filterForText}
                </Component>
              )
            );
          },
          ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
            const rowValue = rows[rowIndex][columnId];
            const contentsIsDefined = rowValue !== null && rowValue !== undefined;
            const cellContent = formattedColumn.formatter.convert(rowValue);

            const filterOutText = i18n.translate(
              'visTypeTable.tableCellFilter.filterOutValueText',
              {
                defaultMessage: 'Filter out value',
              }
            );
            const filterOutAriaLabel = i18n.translate(
              'visTypeTable.tableCellFilter.filterOutValueAriaLabel',
              {
                defaultMessage: 'Filter out value: {cellContent}',
                values: {
                  cellContent,
                },
              }
            );

            return (
              contentsIsDefined && (
                <Component
                  aria-label={filterOutAriaLabel}
                  onClick={() => {
                    onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, true);
                    closeCellPopover?.();
                  }}
                  iconType="minusInCircle"
                >
                  {filterOutText}
                </Component>
              )
            );
          },
        ]
      : undefined;

    const initialWidth = columnsWidth.find((c) => c.colIndex === colIndex);
    const column: EuiDataGridColumn = {
      id: col.id,
      display: col.name,
      displayAsText: col.name,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
        showSortAsc: {
          label: i18n.translate('visTypeTable.sort.ascLabel', {
            defaultMessage: 'Sort asc',
          }),
        },
        showSortDesc: {
          label: i18n.translate('visTypeTable.sort.descLabel', {
            defaultMessage: 'Sort desc',
          }),
        },
      },
      cellActions,
    };

    if (initialWidth) {
      column.initialWidth = initialWidth.width;
    }

    return column;
  });
};
