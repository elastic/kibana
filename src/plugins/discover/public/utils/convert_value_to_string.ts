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
import { DiscoverServices } from '../build_services';
import { DataTableRecord } from '../types';

interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

export const convertValueToString = ({
  rowIndex,
  rows,
  columnId,
  dataView,
  services,
  options,
}: {
  rowIndex: number;
  rows: DataTableRecord[];
  columnId: string;
  dataView: DataView;
  services: DiscoverServices;
  options?: {
    disableMultiline?: boolean;
  };
}): ConvertedResult => {
  const { fieldFormats } = services;
  if (!rows[rowIndex]) {
    return {
      formattedString: '',
      withFormula: false,
    };
  }
  const rowFlattened = rows[rowIndex].flattened;
  const value = rowFlattened?.[columnId];
  const field = dataView.fields.getByName(columnId);
  const valuesArray = Array.isArray(value) ? value : [value];
  const disableMultiline = options?.disableMultiline ?? false;

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
        return escapeFormattedValue(formattedValue);
      }

      return stringify(formattedValue, disableMultiline) || '';
    })
    .join(', ');

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

const escapeValueFn = createEscapeValue(true, true);

const escapeFormattedValue = (formattedValue: string): string => {
  return escapeValueFn(formattedValue);
};
