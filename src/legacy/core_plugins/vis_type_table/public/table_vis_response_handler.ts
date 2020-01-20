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
import { Context } from './table_vis_fn';

export interface TableGroup {
  $parent?: TableGroup;
  table?: Context;
  tables?: TableGroup[];
  title?: string;
  name?: string;
  key?: any;
  column?: number;
  columns?: Context['columns'];
  row?: number;
  rows?: Context['rows'];
  direction?: 'row' | 'column';
}

export const tableVisResponseHandler = (table: Context, dimensions: any) =>
  new Promise(resolve => {
    const converted: Required<TableGroup, 'tables'> = {
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
          // @ts-ignore
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

        // @ts-ignore
        const tableIndex = splitMap[splitValue];
        // @ts-ignore
        converted.tables[tableIndex].tables[0].rows.push(row);
      });
    } else {
      converted.tables.push({
        columns: table.columns,
        rows: table.rows,
      });
    }

    resolve(converted);
  });
