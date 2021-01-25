/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Required } from '@kbn/utility-types';

import { getFormatService } from '../services';
import { Dimensions } from '../types';
import { Input } from './table_vis_legacy_fn';

export interface TableContext {
  tables: Array<TableGroup | Table>;
  direction?: 'row' | 'column';
}

export interface TableGroup {
  $parent: TableContext;
  table: Input;
  tables: Table[];
  title: string;
  name: string;
  key: any;
  column: number;
  row: number;
}

export interface Table {
  $parent?: TableGroup;
  columns: Input['columns'];
  rows: Input['rows'];
}

export function tableVisLegacyResponseHandler(table: Input, dimensions: Dimensions): TableContext {
  const converted: TableContext = {
    tables: [],
  };

  const split = dimensions.splitColumn || dimensions.splitRow;

  if (split) {
    converted.direction = dimensions.splitRow ? 'row' : 'column';
    const splitColumnIndex = split[0].accessor;
    const splitColumnFormatter = getFormatService().deserialize(split[0].format);
    const splitColumn = table.columns[splitColumnIndex];
    const splitMap: Record<string, number> = {};
    let splitIndex = 0;

    table.rows.forEach((row, rowIndex) => {
      const splitValue = row[splitColumn.id];

      if (!splitMap.hasOwnProperty(splitValue)) {
        splitMap[splitValue] = splitIndex++;
        const tableGroup: Required<TableGroup, 'tables'> = {
          $parent: converted,
          title: `${splitColumnFormatter.convert(splitValue)}: ${splitColumn.name}`,
          name: splitColumn.name,
          key: splitValue,
          column: splitColumnIndex,
          row: rowIndex,
          table,
          tables: [],
        };

        tableGroup.tables.push({
          $parent: tableGroup,
          columns: table.columns,
          rows: [],
        });

        converted.tables.push(tableGroup);
      }

      const tableIndex = splitMap[splitValue];
      (converted.tables[tableIndex] as TableGroup).tables[0].rows.push(row);
    });
  } else {
    converted.tables.push({
      columns: table.columns,
      rows: table.rows,
    });
  }

  return converted;
}
