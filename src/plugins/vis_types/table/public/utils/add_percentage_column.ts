/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findIndex } from 'lodash';
import { i18n } from '@kbn/i18n';
import { DatatableColumn } from '@kbn/expressions-plugin';
import { getFormatService } from '../services';
import { FormattedColumns, TableContext } from '../types';

function insertColumn(arr: DatatableColumn[], index: number, col: DatatableColumn) {
  const newArray = [...arr];
  newArray.splice(index + 1, 0, col);
  return newArray;
}

/**
 * Adds a brand new column with percentages of selected column to existing data table
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
    defaultMessage: '{title} percentages',
    values: { title: name },
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
