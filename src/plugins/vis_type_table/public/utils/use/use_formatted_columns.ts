/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
      .map((col, i) => {
        const isBucket = buckets.find(({ accessor }) => accessor === i);
        const dimension = isBucket || metrics.find(({ accessor }) => accessor === i);

        if (!dimension) return undefined;

        const formatter = getFormatService().deserialize(dimension.format);
        const formattedColumn: FormattedColumn = {
          id: col.id,
          title: col.name,
          formatter,
          filterable: !!isBucket,
        };

        const isDate = dimension.format.id === 'date' || dimension.format.params?.id === 'date';
        const allowsNumericalAggregations = formatter.allowsNumericalAggregations;

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
                formattedColumn.formattedTotal = formatter.convert(sumOfColumnValues);
                formattedColumn.total = sumOfColumnValues;
              }
              break;
            }
            case AggTypes.AVG: {
              if (!isDate) {
                const total = sumOfColumnValues / table.rows.length;
                formattedColumn.formattedTotal = formatter.convert(total);
                formattedColumn.total = total;
              }
              break;
            }
            case AggTypes.MIN: {
              const total = chain(table.rows).map(col.id).min().value() as number;
              formattedColumn.formattedTotal = formatter.convert(total);
              formattedColumn.total = total;
              break;
            }
            case AggTypes.MAX: {
              const total = chain(table.rows).map(col.id).max().value() as number;
              formattedColumn.formattedTotal = formatter.convert(total);
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
