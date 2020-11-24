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
import { chain, findIndex } from 'lodash';

import { Table } from '../../table_vis_response_handler';
import { FormattedColumn, TableVisConfig, AggTypes } from '../../types';
import { getFormatService } from '../../services';
import { addPercentageColumn } from '../add_percentage_column';

export const useFormattedColumnsAndRows = (table: Table, visConfig: TableVisConfig) => {
  const { formattedColumns: columns, formattedRows: rows } = useMemo(() => {
    const { buckets, metrics } = visConfig.dimensions;
    let formattedRows = table.rows;

    let formattedColumns = table.columns
      .map<FormattedColumn | undefined>((col, i) => {
        const isBucket = buckets.find(({ accessor }) => accessor === i);
        const dimension = isBucket || metrics.find(({ accessor }) => accessor === i);

        const formatter = dimension ? getFormatService().deserialize(dimension.format) : undefined;

        const formattedColumn: FormattedColumn = {
          id: col.id,
          title: col.name,
          formatter,
          filterable: !!isBucket,
        };

        if (!dimension) return undefined;

        const isDate = dimension.format?.id === 'date' || dimension.format?.params?.id === 'date';
        // @ts-expect-error
        const allowsNumericalAggregations: boolean = formatter?.allowsNumericalAggregations;

        if (allowsNumericalAggregations || isDate || visConfig.totalFunc === AggTypes.COUNT) {
          const sumOfColumnValues = table.rows.reduce((prev, curr) => {
            // some metrics return undefined for some of the values
            // derivative is an example of this as it returns undefined in the first row
            if (curr[col.id] === undefined) return prev;
            return prev + (curr[col.id] as number);
          }, 0);

          formattedColumn.sumTotal = sumOfColumnValues;

          switch (visConfig.totalFunc) {
            case AggTypes.SUM: {
              if (!isDate) {
                formattedColumn.formattedTotal = formatter?.convert(sumOfColumnValues);
                formattedColumn.total = sumOfColumnValues;
              }
              break;
            }
            case AggTypes.AVG: {
              if (!isDate) {
                const total = sumOfColumnValues / table.rows.length;
                formattedColumn.formattedTotal = formatter?.convert(total);
                formattedColumn.total = total;
              }
              break;
            }
            case AggTypes.MIN: {
              const total = chain(table.rows).map(col.id).min().value() as number;
              formattedColumn.formattedTotal = formatter?.convert(total);
              formattedColumn.total = total;
              break;
            }
            case AggTypes.MAX: {
              const total = chain(table.rows).map(col.id).max().value() as number;
              formattedColumn.formattedTotal = formatter?.convert(total);
              formattedColumn.total = total;
              break;
            }
            case AggTypes.COUNT: {
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
      .filter((column): column is FormattedColumn => !!column);

    if (visConfig.percentageCol) {
      const insertAtIndex = findIndex(formattedColumns, { title: visConfig.percentageCol });

      // column to show percentage for was removed
      if (insertAtIndex < 0) return { formattedColumns, formattedRows };

      const { cols, rows: rowsWithPercentage } = addPercentageColumn(
        formattedColumns,
        visConfig.percentageCol,
        table.rows,
        insertAtIndex
      );

      formattedRows = rowsWithPercentage;
      formattedColumns = cols;
    }

    return { formattedColumns, formattedRows };
  }, [table, visConfig.dimensions, visConfig.percentageCol, visConfig.totalFunc]);

  return { columns, rows };
};
