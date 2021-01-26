/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiDataGridColumnCellActionProps, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { Table } from '../table_vis_response_handler';
import { FormattedColumn, TableVisUiState } from '../types';

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
  table: Table,
  columns: FormattedColumn[],
  columnsWidth: TableVisUiState['colWidth'],
  rows: Table['rows'],
  fireEvent: IInterpreterRenderHandlers['event']
) => {
  const onFilterClick = (data: FilterCellData, negate: boolean) => {
    /**
     * Visible column index and the actual one from the source table could be different.
     * e.x. a column could be filtered out if it's not a dimension -
     * see formattedColumns in use_formatted_columns.ts file,
     * or an extra percantage column could be added, which doesn't exist in the raw table
     */
    const rawTableActualColumnIndex = table.columns.findIndex(
      (c) => c.id === columns[data.column].id
    );
    fireEvent({
      name: 'filterBucket',
      data: {
        data: [
          {
            table: {
              ...table,
              rows,
            },
            ...data,
            column: rawTableActualColumnIndex,
          },
        ],
        negate,
      },
    });
  };

  return columns.map(
    (col, colIndex): EuiDataGridColumn => {
      const cellActions = col.filterable
        ? [
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = rows[rowIndex][columnId];
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;
              const cellContent = col.formatter.convert(rowValue);

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
                      closePopover();
                    }}
                    iconType="plusInCircle"
                  >
                    {filterForText}
                  </Component>
                )
              );
            },
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = rows[rowIndex][columnId];
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;
              const cellContent = col.formatter.convert(rowValue);

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
                      closePopover();
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
        display: col.title,
        displayAsText: col.title,
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
    }
  );
};
