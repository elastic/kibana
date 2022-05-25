/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
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
}): string => {
  const { fieldFormats } = services;
  const rowFlattened = rowsFlattened[rowIndex];
  const field = dataView.fields.getByName(columnId);
  const value = rowFlattened[columnId];
  const valuesArray = Array.isArray(value) ? value : [value];
  const disableMultiline = options?.disableMultiline ?? false;

  if (field?.type === '_source') {
    return stringify(rowFlattened, disableMultiline);
  }

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

      if (typeof formattedValue !== 'string' || typeof subValue === 'string') {
        return stringify(formattedValue, disableMultiline) || '';
      }

      return formattedValue;
    })
    .join(', ');

  return formatted;
};

const stringify = (val: object | string, disableMultiline: boolean) => {
  // it will wrap "strings" with quotes
  return disableMultiline ? JSON.stringify(val) : JSON.stringify(val, null, 2);
};
