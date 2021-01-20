/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Required } from '@kbn/utility-types';

import { getFormatService } from './services';
import { Input } from './table_vis_fn';
import { Dimensions } from './types';

export interface TableContext {
  table?: Table;
  tables: TableGroup[];
  direction?: 'row' | 'column';
}

export interface TableGroup {
  table: Input;
  tables: Table[];
  title: string;
  name: string;
  key: string | number;
  column: number;
  row: number;
}

export interface Table {
  columns: Input['columns'];
  rows: Input['rows'];
}

export function tableVisResponseHandler(input: Input, dimensions: Dimensions): TableContext {
  let table: Table | undefined;
  let tables: TableGroup[] = [];
  let direction: TableContext['direction'];

  const split = dimensions.splitColumn || dimensions.splitRow;

  if (split) {
    tables = [];
    direction = dimensions.splitRow ? 'row' : 'column';
    const splitColumnIndex = split[0].accessor;
    const splitColumnFormatter = getFormatService().deserialize(split[0].format);
    const splitColumn = input.columns[splitColumnIndex];
    const splitMap: { [key: string]: number } = {};
    let splitIndex = 0;

    input.rows.forEach((row, rowIndex) => {
      const splitValue: string | number = row[splitColumn.id];

      if (!splitMap.hasOwnProperty(splitValue)) {
        splitMap[splitValue] = splitIndex++;
        const tableGroup: Required<TableGroup, 'tables'> = {
          title: `${splitColumnFormatter.convert(splitValue)}: ${splitColumn.name}`,
          name: splitColumn.name,
          key: splitValue,
          column: splitColumnIndex,
          row: rowIndex,
          table: input,
          tables: [],
        };

        tableGroup.tables.push({
          columns: input.columns,
          rows: [],
        });

        tables.push(tableGroup);
      }

      const tableIndex = splitMap[splitValue];
      tables[tableIndex].tables[0].rows.push(row);
    });
  } else {
    table = {
      columns: input.columns,
      rows: input.rows,
    };
  }

  return {
    direction,
    table,
    tables,
  };
}
