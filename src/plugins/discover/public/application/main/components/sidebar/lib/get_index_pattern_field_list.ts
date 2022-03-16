/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { difference } from 'lodash';
import { DataView, DataViewField } from 'src/plugins/data_views/public';
import { isNestedFieldParent } from '../../../utils/nested_fields';

export function getIndexPatternFieldList(
  indexPattern?: DataView,
  fieldCounts?: Record<string, number>
) {
  if (!indexPattern || !fieldCounts) return [];

  const fieldNamesInDocs = Object.keys(fieldCounts);
  const fieldNamesInIndexPattern = indexPattern.fields.getAll().map((fld) => fld.name);
  const unknownFields: DataViewField[] = [];

  difference(fieldNamesInDocs, fieldNamesInIndexPattern).forEach((unknownFieldName) => {
    if (isNestedFieldParent(unknownFieldName, indexPattern)) {
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

  return [...indexPattern.fields.getAll(), ...unknownFields];
}
