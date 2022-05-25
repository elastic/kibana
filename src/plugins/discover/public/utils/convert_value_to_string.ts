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
    allowMultiline: boolean;
  };
}): string => {
  const { fieldFormats } = services;
  const rowFlattened = rowsFlattened[rowIndex];
  const field = dataView.fields.getByName(columnId);
  const value = rowFlattened[columnId];
  const valuesArray = Array.isArray(value) ? value : [value];
  const disableMultiline = options?.allowMultiline === false;

  const stringify = (val: object) => {
    return disableMultiline ? JSON.stringify(val) : JSON.stringify(val, null, 2);
  };

  if (field?.type === '_source') {
    return stringify(rowFlattened);
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
          skipStringifiedJSONFormatting: disableMultiline,
        }
      );

      return typeof formattedValue === 'string' ? formattedValue : stringify(formattedValue);
    })
    .join(', ');

  return formatted;
};
