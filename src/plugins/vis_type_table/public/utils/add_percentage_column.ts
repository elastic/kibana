/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DatatableRow } from 'src/plugins/expressions';
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
  const newRows = rows.map<DatatableRow>((row) => ({
    [newId]: (row[id] as number) / (sumTotal as number),
    ...row,
  }));

  return { cols: newCols, rows: newRows };
}
