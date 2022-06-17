/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { cellHasFormulas, createEscapeValue } from '@kbn/data-plugin/common';
import { formatFieldValue } from './format_value';
import { DataTableRecord } from '../types';

export interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

export const convertValueToString = ({
  row,
  columnId,
  dataView,
  options,
}: {
  row?: DataTableRecord;
  columnId: string;
  dataView: DataView;
  options?: {
    disableMultiline?: boolean;
  };
}): ConvertedResult => {
  if (!row) {
    return {
      formattedString: '',
      withFormula: false,
    };
  }

  const field = dataView.fields.getByName(columnId);
  const disableMultiline = options?.disableMultiline ?? false;

  if (field?.type === '_source') {
    return {
      formattedString: stringify(row.raw, disableMultiline),
      withFormula: false,
    };
  }

  const formatted = formatFieldValue(columnId, row, dataView, 'text', {
    skipFormattingInStringifiedJSON: disableMultiline,
  });

  return {
    formattedString: escapeFormattedValue(formatted),
    withFormula: cellHasFormulas(formatted),
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

const escapeValueFn = createEscapeValue(true, true);

const escapeFormattedValue = (formattedValue: string): string => {
  return escapeValueFn(formattedValue);
};
