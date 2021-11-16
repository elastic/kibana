/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { difference } from 'lodash';
import { IndexPattern, IndexPatternField } from 'src/plugins/data/public';
import { isNestedFieldParent } from '../../../utils/nested_fields';
import { ElasticSearchHit } from '../../../../../doc_views/doc_views_types';
import { calcFieldCounts } from '../../../utils/calc_field_counts';
import { FieldFilterState, isFieldFiltered } from './field_filter';

export function getIndexPatternFieldList(
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[],
  fieldFilterState: FieldFilterState
) {
  if (!indexPattern) return [];
  const fieldCounts = calcFieldCounts(rows, indexPattern);
  const fieldNamesInDocs = Object.keys(calcFieldCounts(rows, indexPattern));
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

  return [...indexPattern.fields.getAll(), ...unknownFields].filter((field) =>
    isFieldFiltered(field, fieldFilterState, fieldCounts)
  );
}
