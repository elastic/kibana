/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { cellHasFormulas, createEscapeValue } from '@kbn/data-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { DataTableRecord } from '../../types';
import { formatFieldValue } from './format_value';

interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

const separator = ',';

export const convertValueToString = ({
  dataView,
  dataViewField,
  flattenedValue,
  dataTableRecord,
  fieldFormats,
  options,
}: {
  dataView: DataView;
  dataViewField?: DataViewField;
  flattenedValue: unknown;
  dataTableRecord: DataTableRecord;
  fieldFormats: FieldFormatsStart;
  options?: {
    compatibleWithCSV?: boolean; // values as one-liner + escaping formulas + adding wrapping quotes
    compatibleWithMarkdown?: boolean; // values as one-liner
  };
}): ConvertedResult => {
  const disableMultiline = (options?.compatibleWithMarkdown || options?.compatibleWithCSV) ?? false;

  if (dataViewField?.type === '_source') {
    return {
      formattedString: stringify(dataTableRecord.flattened, disableMultiline),
      withFormula: false,
    };
  }

  const valuesArray = Array.isArray(flattenedValue) ? flattenedValue : [flattenedValue];
  const enableEscapingForValue = options?.compatibleWithCSV ?? false;
  let withFormula = false;

  const formatted = valuesArray
    .map((subValue) => {
      const formattedValue = formatFieldValue(
        subValue,
        dataTableRecord.raw,
        fieldFormats,
        dataView,
        dataViewField,
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
    withFormula: options?.compatibleWithMarkdown ? false : withFormula,
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
