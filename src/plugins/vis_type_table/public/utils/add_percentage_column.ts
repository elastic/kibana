/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { findIndex } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Datatable, DatatableColumn } from 'src/plugins/expressions';
import { getFormatService } from '../services';
import { FormattedColumns, TableContext } from '../types';

function insertColumn(arr: DatatableColumn[], index: number, col: DatatableColumn) {
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
export function addPercentageColumn(table: TableContext, name: string) {
  const { columns, rows, formattedColumns } = table;
  const insertAtIndex = findIndex(columns, { name });
  // column to show percentage for was removed
  if (insertAtIndex < 0) return table;

  const { id } = columns[insertAtIndex];
  const { sumTotal } = formattedColumns[id];
  const percentageColumnId = `${id}-percents`;
  const formatter = getFormatService().deserialize({ id: 'percent' });
  const percentageColumnName = i18n.translate('visTypeTable.params.percentageTableColumnName', {
    defaultMessage: '{name} percentages',
    values: { name },
  });
  const newCols = insertColumn(columns, insertAtIndex, {
    name: percentageColumnName,
    id: percentageColumnId,
    meta: {
      type: 'number',
      params: { id: 'percent' },
    },
  });
  const newFormattedColumns: FormattedColumns = {
    ...formattedColumns,
    [percentageColumnId]: {
      title: percentageColumnName,
      formatter,
      filterable: false,
    },
  };
  const newRows = rows.map((row) => ({
    [percentageColumnId]: (row[id] as number) / (sumTotal as number),
    ...row,
  }));

  return {
    columns: newCols,
    rows: newRows,
    formattedColumns: newFormattedColumns,
  };
}
