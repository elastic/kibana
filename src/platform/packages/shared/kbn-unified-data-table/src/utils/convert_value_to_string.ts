/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { cellHasFormulas, createEscapeValue } from '@kbn/data-plugin/common';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import { formatFieldValue } from '@kbn/discover-utils';

interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

const separator = ',';

export const convertValueToString = ({
  rowIndex,
  rows,
  columnId,
  dataView,
  fieldFormats,
  columnsMeta,
  options,
}: {
  rowIndex: number;
  rows: DataTableRecord[];
  columnId: string;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  columnsMeta: DataTableColumnsMeta | undefined;
  options?: {
    compatibleWithCSV?: boolean; // values as one-liner + escaping formulas + adding wrapping quotes
  };
}): ConvertedResult => {
  if (!rows[rowIndex]) {
    return {
      formattedString: '',
      withFormula: false,
    };
  }
  const rowFlattened = rows[rowIndex].flattened;
  const value = rowFlattened?.[columnId];
  const field = getDataViewFieldOrCreateFromColumnMeta({
    fieldName: columnId,
    dataView,
    columnMeta: columnsMeta?.[columnId],
  });
  const valuesArray = Array.isArray(value) ? value : [value];
  const disableMultiline = options?.compatibleWithCSV ?? false;
  const enableEscapingForValue = options?.compatibleWithCSV ?? false;

  if (field?.type === '_source') {
    return {
      formattedString: stringify(rowFlattened, disableMultiline),
      withFormula: false,
    };
  }

  let withFormula = false;

  const formatted = valuesArray
    .map((subValue) => {
      const formattedValue = formatFieldValue(
        subValue,
        rows[rowIndex].raw,
        fieldFormats,
        dataView,
        field,
        'text',
        {
          skipFormattingInStringifiedJSON: disableMultiline,
        }
      );

      if (typeof formattedValue === 'string') {
        withFormula = withFormula || cellHasFormulas(formattedValue);
        return enableEscapingForValue ? escapeFormattedValue(formattedValue) : formattedValue;
      }

      return stringify(formattedValue, disableMultiline) || '';
    })
    .join(`${separator} `);

  return {
    formattedString: formatted,
    withFormula,
  };
};

export const convertNameToString = (name: string): ConvertedResult => {
  return {
    formattedString: escapeFormattedValue(name),
    withFormula: cellHasFormulas(name),
  };
};

const stringify = (val: object | string, disableMultiline: boolean) => {
  // it can wrap "strings" with quotes
  return disableMultiline ? JSON.stringify(val) : JSON.stringify(val, null, 2);
};

const escapeValueFn = createEscapeValue({
  separator,
  quoteValues: true,
  escapeFormulaValues: true,
});

const escapeFormattedValue = (formattedValue: string): string => {
  return escapeValueFn(formattedValue);
};
