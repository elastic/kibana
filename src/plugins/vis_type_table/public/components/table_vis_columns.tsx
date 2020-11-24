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

import React from 'react';
import { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { Table } from '../table_vis_response_handler';
import { FormattedColumn } from '../types';

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
  rows: Table['rows'],
  fireEvent: IInterpreterRenderHandlers['event']
) => {
  const onFilterClick = (data: FilterCellData, negate: boolean) => {
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
          },
        ],
        negate,
      },
    });
  };

  return columns.map((col, colIndex) => {
    const cellActions = col.filterable
      ? [
          ({ rowIndex, columnId, Component }: EuiDataGridColumnCellActionProps) => {
            const rowValue = rows[rowIndex][columnId];
            const contentsIsDefined = rowValue !== null && rowValue !== undefined;
            const cellContent = col.formatter?.convert(rowValue) || rowValue;

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
                  onClick={() =>
                    onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, false)
                  }
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
            const cellContent = col.formatter?.convert(rowValue) || rowValue;

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
                  onClick={() =>
                    onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, true)
                  }
                  iconType="minusInCircle"
                >
                  {filterOutText}
                </Component>
              )
            );
          },
        ]
      : undefined;

    return {
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
  });
};
