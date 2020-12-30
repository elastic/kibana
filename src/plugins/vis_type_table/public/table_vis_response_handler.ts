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
