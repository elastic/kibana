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

import { isObject } from 'lodash';
// @ts-ignore
import { saveAs } from '@elastic/filesaver';

import { CoreStart } from 'kibana/public';
import { DatatableRow } from 'src/plugins/expressions';
import { CSV_SEPARATOR_SETTING, CSV_QUOTE_VALUES_SETTING } from '../../../share/public';
import { FormattedColumn } from '../types';
import { Table } from '../table_vis_response_handler';

const nonAlphaNumRE = /[^a-zA-Z0-9]/;
const allDoubleQuoteRE = /"/g;

interface ToCsvData {
  filename?: string;
  cols: FormattedColumn[];
  rows: DatatableRow[];
  table: Table;
  uiSettings: CoreStart['uiSettings'];
}

const toCsv = (formatted: boolean, { cols, rows, table, uiSettings }: ToCsvData) => {
  const separator = uiSettings.get(CSV_SEPARATOR_SETTING);
  const quoteValues = uiSettings.get(CSV_QUOTE_VALUES_SETTING);

  function escape(val: unknown) {
    if (!formatted && isObject(val)) val = val.valueOf();
    val = String(val);
    if (quoteValues && nonAlphaNumRE.test(val as string)) {
      val = '"' + (val as string).replace(allDoubleQuoteRE, '""') + '"';
    }
    return val as string;
  }

  const csvRows: string[][] = [];

  for (const row of rows) {
    const rowArray: string[] = [];
    for (const col of cols) {
      const value = row[col.id];
      const formattedValue =
        formatted && (col as FormattedColumn).formatter
          ? escape((col as FormattedColumn).formatter?.convert(value))
          : escape(value);
      rowArray.push(formattedValue);
    }
    csvRows.push(rowArray);
  }

  // add headers to the rows
  csvRows.unshift(cols.map(({ title }) => escape(title)));

  return csvRows.map((row) => row.join(separator) + '\r\n').join('');
};

export const exportAsCsv = (formatted: boolean, data: ToCsvData) => {
  const csv = new Blob([toCsv(formatted, data)], { type: 'text/plain;charset=utf-8' });
  saveAs(csv, `${data.filename || 'unsaved'}.csv`);
};
