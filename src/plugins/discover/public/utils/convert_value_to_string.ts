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
  const valArr = Array.isArray(value) ? value : [value];

  const stringify = (val: object) => {
    return (
      (options?.allowMultiline === false ? JSON.stringify(val) : JSON.stringify(val, null, 2)) || ''
    );
  };

  const formattedValue =
    field?.type === '_source'
      ? rowFlattened
      : valArr
          .map((v) =>
            field?.type === 'unknown' || !field?.type
              ? stringify(v)
              : formatFieldValue(v, rows[rowIndex], fieldFormats, dataView, field, 'text')
          )
          .join(', ');

  if (typeof formattedValue === 'string') {
    return formattedValue;
  }

  return stringify(formatFieldValue);
};
