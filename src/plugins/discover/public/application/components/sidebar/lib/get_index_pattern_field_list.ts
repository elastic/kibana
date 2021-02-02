/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { difference } from 'lodash';
import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { isNestedFieldParent } from '../../../helpers/nested_fields';

export function getIndexPatternFieldList(
  indexPattern?: IndexPattern,
  fieldCounts?: Record<string, number>
) {
  if (!indexPattern || !fieldCounts) return [];

  const fieldNamesInDocs = Object.keys(fieldCounts);
  const fieldNamesInIndexPattern = indexPattern.fields.getAll().map((fld) => fld.name);
  const unknownFields: IndexPatternField[] = [];

  difference(fieldNamesInDocs, fieldNamesInIndexPattern).forEach((unknownFieldName) => {
    if (isNestedFieldParent(unknownFieldName, indexPattern)) {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'nested',
      } as IndexPatternField);
    } else {
      unknownFields.push({
        displayName: String(unknownFieldName),
        name: String(unknownFieldName),
        type: 'unknown',
      } as IndexPatternField);
    }
  });

  return [...indexPattern.fields.getAll(), ...unknownFields];
}
