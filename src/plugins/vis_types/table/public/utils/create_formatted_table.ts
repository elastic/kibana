/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { chain } from 'lodash';
import { Datatable } from '@kbn/expressions-plugin';
import { getFormatService } from '../services';
import { FormattedColumn, FormattedColumns, TableVisConfig, TableContext } from '../types';
import { AggTypes } from '../../common';

export const createFormattedTable = (
  table: Datatable | TableContext,
  visConfig: TableVisConfig
) => {
  const { buckets, metrics } = visConfig;

  const formattedColumns = table.columns.reduce<FormattedColumns>((acc, col, i) => {
    const isBucket = buckets?.find(({ accessor }) => accessor === i);
    const dimension = isBucket || metrics.find(({ accessor }) => accessor === i);

    if (!dimension) return acc;

    const formatter = getFormatService().deserialize(dimension.format);
    const formattedColumn: FormattedColumn = {
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

    acc[col.id] = formattedColumn;

    return acc;
  }, {});

  return {
    // filter out columns which are not dimensions
    columns: table.columns.filter((col) => formattedColumns[col.id]),
    rows: table.rows,
    formattedColumns,
  };
};
