/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SynonymsSynonymString } from '@elastic/elasticsearch/lib/api/types';
import { Datatable, DatatableColumnMeta } from '@kbn/expressions-plugin/common';
import { FieldFormat, IFieldFormat } from '@kbn/field-formats-plugin/common';

export interface DatatableWithFormatInfo {
  table: Datatable;
  formattedColumns: Record<string, true>;
}

/**
 * Formats a datatable by applying field formatters to specific columns (such as categorical X axis or split/slice charts),
 * and generates a mapping of formatted columns and inverted raw values.
 */
export const getFormattedTable = (
  table: Datatable,
  shouldApplyFormat: (columnId: string) => boolean,
  getFormatterByColumnId: (id: string, meta: DatatableColumnMeta) => FieldFormat,
  onFormattedValue?: (id: SynonymsSynonymString, formattedValue: string, value: unknown) => void
): DatatableWithFormatInfo => {
  // these are the formatters of the data only for categorical X asis or split/slice charts
  const columnsFormatters = table.columns.reduce<Array<[string, IFieldFormat]>>(
    (formatters, { id, meta }) => {
      return shouldApplyFormat(id)
        ? [...formatters, [id, getFormatterByColumnId(id, meta)]]
        : formatters;
    },
    []
  );

  const formattedRows: Datatable['rows'] = [];
  for (const row of table.rows) {
    const partialFormattedRow = columnsFormatters.reduce<Record<string, string>>(
      (acc, [id, formatter]) => {
        const value = row[id];
        const formattedValue = formatter.convert(value);
        onFormattedValue?.(id, formattedValue, value);
        return { ...acc, [id]: formattedValue };
      },
      {}
    );
    formattedRows.push({ ...row, ...partialFormattedRow });
  }
  const formattedColumns: Record<string, true> = Object.fromEntries(
    columnsFormatters.map<[string, true]>(([id]) => [id, true])
  );

  return {
    table: { ...table, rows: formattedRows },
    formattedColumns,
  };
};
