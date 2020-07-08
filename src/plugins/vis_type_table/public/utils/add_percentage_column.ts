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

import { i18n } from '@kbn/i18n';
import { KibanaDatatableRow } from 'src/plugins/expressions';
import { getFormatService } from '../services';
import { FormattedColumn } from '../types';
import { Table } from '../table_vis_response_handler';

function insertColumn(arr: FormattedColumn[], index: number, col: FormattedColumn) {
  const newArray = [...arr];
  newArray.splice(index + 1, 0, col);
  return newArray;
}

/**
 * @param columns - the formatted columns that will be displayed
 * @param title - the title of the column to add to
 * @param rows - the row data for the columns
 * @param insertAtIndex - the index to insert the percentage column at
 * @returns cols and rows for the table to render now included percentage column(s)
 */
export function addPercentageColumn(
  columns: FormattedColumn[],
  title: string,
  rows: Table['rows'],
  insertAtIndex: number
) {
  const { id, sumTotal } = columns[insertAtIndex];
  const newId = `${id}-percents`;
  const formatter = getFormatService().deserialize({ id: 'percent' });
  const i18nTitle = i18n.translate('visTypeTable.params.percentageTableColumnName', {
    defaultMessage: '{title} percentages',
    values: { title },
  });
  const newCols = insertColumn(columns, insertAtIndex, {
    title: i18nTitle,
    id: newId,
    formatter,
    filterable: false,
  });
  const newRows = rows.map<KibanaDatatableRow>((row) => ({
    [newId]: (row[id] as number) / (sumTotal as number),
    ...row,
  }));

  return { cols: newCols, rows: newRows };
}
