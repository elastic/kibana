/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { chain } from 'lodash';
import { Datatable } from 'src/plugins/expressions';
import { getFormatService } from '../services';
import {
  FormattedColumn,
  FormattedColumns,
  TableVisData,
  TableGroup,
  TableVisConfig,
  TableContext,
} from '../types';
import { AggTypes } from '../../common';
import { addPercentageColumn } from './add_percentage_column';

const createFormattedColumns = (table: Datatable | TableContext, visConfig: TableVisConfig) => {
  const { buckets, metrics } = visConfig.dimensions;

  return table.columns.reduce<FormattedColumns>((acc, col, i) => {
    const isBucket = buckets.find(({ accessor }) => accessor === i);
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
};

export function tableVisResponseHandler(input: Datatable, visConfig: TableVisConfig): TableVisData {
  const tables: TableGroup[] = [];
  let table: TableContext | undefined;
  let direction: TableVisData['direction'];

  const split = visConfig.dimensions.splitColumn || visConfig.dimensions.splitRow;

  if (split) {
    direction = visConfig.dimensions.splitRow ? 'row' : 'column';
    const splitColumnIndex = split[0].accessor;
    const splitColumnFormatter = getFormatService().deserialize(split[0].format);
    const splitColumn = input.columns[splitColumnIndex];
    const columns = input.columns.filter((c, idx) => idx !== splitColumnIndex);
    const splitMap: { [key: string]: number } = {};
    let splitIndex = 0;

    input.rows.forEach((row) => {
      const splitValue: string | number = row[splitColumn.id];

      if (!splitMap.hasOwnProperty(splitValue)) {
        splitMap[splitValue] = splitIndex++;
        const tableGroup: TableGroup = {
          title: `${splitColumnFormatter.convert(splitValue)}: ${splitColumn.name}`,
          table: {
            columns,
            rows: [],
            formattedColumns: {},
          },
        };

        tables.push(tableGroup);
      }

      const tableIndex = splitMap[splitValue];
      tables[tableIndex].table.rows.push(row);
    });

    tables.forEach((tg) => {
      tg.table.formattedColumns = createFormattedColumns(
        { ...tg.table, columns: input.columns },
        visConfig
      );
      tg.table = addPercentageColumn(tg.table, visConfig.percentageCol);
    });
  } else {
    const formattedColumns = createFormattedColumns(input, visConfig);
    table = {
      ...input,
      formattedColumns,
    };

    if (visConfig.percentageCol) {
      table = addPercentageColumn(table, visConfig.percentageCol);
    }
  }

  return {
    direction,
    table,
    tables,
  };
}
