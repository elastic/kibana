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
import { ElasticSearchHit, HitsFlattened } from '../types';
import { DiscoverServices } from '../build_services';

export const convertValueToString = ({
  rowIndex,
  rows,
  rowsFlattened,
  columnId,
  dataView,
  services,
  options,
}: {
  rowIndex: number;
  rows: ElasticSearchHit[];
  rowsFlattened: HitsFlattened;
  columnId: string;
  dataView: DataView;
  services: DiscoverServices;
  options?: {
    disableMultiline?: boolean;
  };
}): { formattedString: string; withFormula: boolean } => {
  const { fieldFormats } = services;
  const rowFlattened = rowsFlattened[rowIndex];
  const field = dataView.fields.getByName(columnId);
  const value = rowFlattened[columnId];
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
        rows[rowIndex],
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

export const convertNameToString = (
  name: string
): { formattedString: string; withFormula: boolean } => {
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
