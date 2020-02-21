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

import { getFormat } from './legacy_imports';
import { Input } from './table_vis_fn';

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

export function tableVisResponseHandler(table: Input, dimensions: any): TableContext {
  const converted: TableContext = {
    tables: [],
  };

  const split = dimensions.splitColumn || dimensions.splitRow;

  if (split) {
    converted.direction = dimensions.splitRow ? 'row' : 'column';
    const splitColumnIndex = split[0].accessor;
    const splitColumnFormatter = getFormat(split[0].format);
    const splitColumn = table.columns[splitColumnIndex];
    const splitMap = {};
    let splitIndex = 0;

    table.rows.forEach((row, rowIndex) => {
      const splitValue: any = row[splitColumn.id];

      if (!splitMap.hasOwnProperty(splitValue as any)) {
        (splitMap as any)[splitValue] = splitIndex++;
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

      const tableIndex = (splitMap as any)[splitValue];
      (converted.tables[tableIndex] as any).tables[0].rows.push(row);
    });
  } else {
    converted.tables.push({
      columns: table.columns,
      rows: table.rows,
    });
  }

  return converted;
}
