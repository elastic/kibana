/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin';
import { getFormatService } from '../services';
import { TableVisData, TableGroup, TableVisConfig, TableContext } from '../types';
import { addPercentageColumn } from './add_percentage_column';
import { createFormattedTable } from './create_formatted_table';

/**
 * Converts datatable input from response into appropriate format for consuming renderer
 */
export function tableVisResponseHandler(input: Datatable, visConfig: TableVisConfig): TableVisData {
  const tables: TableGroup[] = [];
  let table: TableContext | undefined;
  let direction: TableVisData['direction'];

  const split = visConfig.splitColumn || visConfig.splitRow;

  if (split) {
    direction = visConfig.splitRow ? 'row' : 'column';
    const splitColumnIndex = split.accessor as number;
    const splitColumnFormatter = getFormatService().deserialize(split.format);
    const splitColumn = input.columns[splitColumnIndex];
    const splitMap: { [key: string]: number } = {};
    let splitIndex = 0;

    input.rows.forEach((row) => {
      const splitValue: string | number = row[splitColumn.id];

      if (!splitMap.hasOwnProperty(splitValue)) {
        splitMap[splitValue] = splitIndex++;
        const tableGroup: TableGroup = {
          title: `${splitColumnFormatter.convert(splitValue)}: ${splitColumn.name}`,
          table: {
            columns: input.columns,
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
      tg.table = createFormattedTable(tg.table, visConfig);

      if (visConfig.percentageCol) {
        tg.table = addPercentageColumn(tg.table, visConfig.percentageCol);
      }
    });
  } else {
    table = createFormattedTable(input, visConfig);

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
