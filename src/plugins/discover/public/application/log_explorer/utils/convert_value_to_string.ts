/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { cellHasFormulas, createEscapeValue } from '@kbn/data-plugin/common';
import { formatFieldValue } from '../../../utils/format_value';
import { DiscoverServices } from '../../../build_services';
import { LogExplorerRow } from '../types';

interface ConvertedResult {
  formattedString: string;
  withFormula: boolean;
}

// NOTE: This could (with a little work) probably be aligned with the main Discover convertValueToString function.
export const convertValueToString = ({
  rowIndex,
  rows,
  columnId,
  dataView,
  services,
  options,
}: {
  rowIndex: number;
  rows: Map<number, LogExplorerRow>;
  columnId: string;
  dataView: DataView;
  services: DiscoverServices;
  options?: {
    disableMultiline?: boolean;
  };
}): ConvertedResult => {
  const { fieldFormats } = services;
  const rowsArray = Array.from(rows);
  const row = rowsArray[rowIndex];

  if (!row || row[1].type !== 'loaded-entry') {
    return {
      formattedString: '',
      withFormula: false,
    };
  }
  const rowEntry = row[1].entry;
  const rowFlattened = rowEntry.flattened;
  const value = rowFlattened?.[columnId];
  const field = dataView.fields.getByName(columnId);
  const valuesArray = Array.isArray(value) ? value : [value];
  const disableMultiline = options?.disableMultiline ?? false;

  let withFormula = false;

  const formatted = valuesArray
    .map((subValue) => {
      const formattedValue = formatFieldValue(
        subValue,
        rowEntry.raw,
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
