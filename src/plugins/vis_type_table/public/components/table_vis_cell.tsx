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

import React, { useCallback } from 'react';
import {
  EuiDataGridCellValueElementProps,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { ExprVis } from 'src/plugins/visualizations/public';
import { TableVisParams } from '../types';
import { Table } from '../table_vis_response_handler';
import { getFormatService } from '../services';

export const createTableVisCell = (table: Table, vis: ExprVis, visParams: TableVisParams) => ({
  // @ts-expect-error
  colIndex,
  rowIndex,
  columnId,
}: EuiDataGridCellValueElementProps) => {
  const { buckets, metrics, splitColumn, splitRow } = visParams.dimensions;

  const formattedColumns = table.columns
    .map(function (col, i) {
      const isBucket = buckets.find(({ accessor }) => accessor === i);
      const isSplitColumn = splitColumn?.find(({ accessor }) => accessor === i);
      const isSplitRow = splitRow?.find(({ accessor }) => accessor === i);
      const dimension = isBucket || isSplitColumn || metrics.find(({ accessor }) => accessor === i);

      const formatter = dimension ? getFormatService().deserialize(dimension.format) : undefined;

      const formattedColumn = {
        id: col.id,
        title: col.name,
        formatter,
        filterable: !!isBucket,
      };

      return formattedColumn;

      if (isSplitRow) {
        $scope.splitRow = formattedColumn;
      }

      if (!dimension) return;

      const last = i === table.columns.length - 1;

      if (last || !isBucket) {
        formattedColumn.class = 'visualize-table-right';
      }

      const isDate = dimension.format?.id === 'date' || dimension.format?.params?.id === 'date';
      const allowsNumericalAggregations = formatter?.allowsNumericalAggregations;

      let { totalFunc } = $scope;
      if (typeof totalFunc === 'undefined' && showPercentage) {
        totalFunc = 'sum';
      }

      if (allowsNumericalAggregations || isDate || totalFunc === 'count') {
        const sum = (tableRows) => {
          return _.reduce(
            tableRows,
            function (prev, curr) {
              // some metrics return undefined for some of the values
              // derivative is an example of this as it returns undefined in the first row
              if (curr[col.id] === undefined) return prev;
              return prev + curr[col.id];
            },
            0
          );
        };

        formattedColumn.sumTotal = sum(table.rows);
        switch (totalFunc) {
          case 'sum': {
            if (!isDate) {
              const total = formattedColumn.sumTotal;
              formattedColumn.formattedTotal = formatter.convert(total);
              formattedColumn.total = formattedColumn.sumTotal;
            }
            break;
          }
          case 'avg': {
            if (!isDate) {
              const total = sum(table.rows) / table.rows.length;
              formattedColumn.formattedTotal = formatter.convert(total);
              formattedColumn.total = total;
            }
            break;
          }
          case 'min': {
            const total = _.chain(table.rows).map(col.id).min().value();
            formattedColumn.formattedTotal = formatter.convert(total);
            formattedColumn.total = total;
            break;
          }
          case 'max': {
            const total = _.chain(table.rows).map(col.id).max().value();
            formattedColumn.formattedTotal = formatter.convert(total);
            formattedColumn.total = total;
            break;
          }
          case 'count': {
            const total = table.rows.length;
            formattedColumn.formattedTotal = total;
            formattedColumn.total = total;
            break;
          }
          default:
            break;
        }
      }

      return formattedColumn;
    })
    .filter((column) => column);

  const rowValue = table.rows[rowIndex][columnId];
  const column = formattedColumns.find(({ id }) => id === columnId);

  // An AggConfigResult can "enrich" cell contents by applying a field formatter,
  // which we want to do if possible.
  const contentsIsDefined = rowValue !== null && rowValue !== undefined;

  const cellContent = contentsIsDefined ? column?.formatter?.convert(rowValue) : '';

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

  const cell = (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem>{cellContent}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={() => onFilterClick(false)}
          iconType="magnifyWithPlus"
          aria-label="Next"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          onClick={() => onFilterClick(true)}
          iconType="magnifyWithMinus"
          aria-label="Next"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return column?.filterable && contentsIsDefined ? cell : cellContent;
};
