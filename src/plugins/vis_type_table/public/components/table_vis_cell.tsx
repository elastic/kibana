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

import './table_vis_cell.scss';
import React, { useCallback } from 'react';
import {
  EuiDataGridCellValueElementProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { i18n } from '@kbn/i18n';
import { Table } from '../table_vis_response_handler';
import { FormattedColumn } from '../types';

export const createTableVisCell = (
  table: Table,
  formattedColumns: FormattedColumn[],
  rows: Table['rows'],
  vis: ExprVis
) => ({
  // @ts-expect-error
  colIndex,
  rowIndex,
  columnId,
}: EuiDataGridCellValueElementProps) => {
  const rowValue = rows[rowIndex][columnId];
  const column = formattedColumns[colIndex];
  const contentsIsDefined = rowValue !== null && rowValue !== undefined;
  const content = column?.formatter?.convert(rowValue, 'html') || (rowValue as string) || '';

  const cellContent = (
    <div
      /*
       * Justification for dangerouslySetInnerHTML:
       * The Data table visualization can "enrich" cell contents by applying a field formatter,
       * which we want to do if possible.
       */
      dangerouslySetInnerHTML={{ __html: content }} // eslint-disable-line react/no-danger
    />
  );

  const onFilterClick = useCallback(
    (negate: boolean) => {
      vis.API.events.filter({
        data: [
          {
            table,
            row: rowIndex,
            column: colIndex,
            value: rowValue,
          },
        ],
        negate,
      });
    },
    [colIndex, rowIndex, rowValue]
  );

  if (column?.filterable && contentsIsDefined) {
    const filterForToolTipText = i18n.translate(
      'visTypeTable.tableCellFilter.filterForValueTooltip',
      {
        defaultMessage: 'Filter for value',
      }
    );
    const filterOutToolTipText = i18n.translate(
      'visTypeTable.tableCellFilter.filterOutValueTooltip',
      {
        defaultMessage: 'Filter out value',
      }
    );

    return (
      <EuiFlexGroup className="tbvChartCell__filterable" gutterSize="s" alignItems="center">
        <EuiFlexItem>{cellContent}</EuiFlexItem>

        <EuiFlexItem className="tbvChartCellFilter" grow={false}>
          <EuiToolTip content={filterForToolTipText}>
            <EuiButtonIcon
              aria-label={filterForToolTipText}
              data-test-subj="filterForCellValue"
              onClick={() => onFilterClick(false)}
              iconType="magnifyWithPlus"
            />
          </EuiToolTip>
        </EuiFlexItem>

        <EuiFlexItem className="tbvChartCellFilter" grow={false}>
          <EuiToolTip content={filterOutToolTipText}>
            <EuiButtonIcon
              aria-label={filterOutToolTipText}
              onClick={() => onFilterClick(true)}
              iconType="magnifyWithMinus"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return cellContent;
};
