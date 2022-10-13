/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { difference } from 'lodash';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { isNestedFieldParent } from '../../../utils/nested_fields';

export function getDataViewFieldList(dataView?: DataView, fieldCounts?: Record<string, number>) {
  if (!dataView || !fieldCounts) return [];

  const fieldNamesInDocs = Object.keys(fieldCounts);
  const fieldNamesInDataView = dataView.fields.getAll().map((fld) => fld.name);
  const unknownFields: DataViewField[] = [];

  difference(fieldNamesInDocs, fieldNamesInDataView).forEach((unknownFieldName) => {
    if (isNestedFieldParent(unknownFieldName, dataView)) {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'nested',
      } as DataViewField);
    } else {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'unknown',
      } as DataViewField);
    }
  });

  return [...dataView.fields.getAll(), ...unknownFields];
}
