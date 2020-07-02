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

import { useMemo } from 'react';

import { Table } from '../../table_vis_response_handler';
import { TableVisParams } from '../../types';
import { getFormatService } from '../../services';

export const useFormattedColumns = (table: Table, visParams: TableVisParams) => {
  const formattedColumns = useMemo(() => {
    const { buckets, metrics, splitColumn, splitRow } = visParams.dimensions;

    return table.columns
      .map(function (col, i) {
        const isBucket = buckets.find(({ accessor }) => accessor === i);
        const isSplitColumn = splitColumn?.find(({ accessor }) => accessor === i);
        const isSplitRow = splitRow?.find(({ accessor }) => accessor === i);
        const dimension =
          isBucket || isSplitColumn || metrics.find(({ accessor }) => accessor === i);

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
  }, [table, visParams.dimensions]);

  return formattedColumns;
};
