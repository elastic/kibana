/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { ES_FIELD_TYPES } from '@kbn/field-types';

// copied from @kbn/discover-utils to avoid cyclic dependency
const FILTER_OUT_EXACT_FIELDS_FOR_CONTENT = [
  '_id',
  '_index',
  '_source',
  '_size',
  '_doc_count',
  '_field_names',
  '_ignored',
  '_routing',
  '_meta',
  '_tier',
];

export function extractMetricFields(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  const numericTypes = [
    ES_FIELD_TYPES.LONG,
    ES_FIELD_TYPES.INTEGER,
    ES_FIELD_TYPES.SHORT,
    ES_FIELD_TYPES.BYTE,
    ES_FIELD_TYPES.DOUBLE,
    ES_FIELD_TYPES.FLOAT,
    ES_FIELD_TYPES.HALF_FLOAT,
    ES_FIELD_TYPES.SCALED_FLOAT,
    ES_FIELD_TYPES.UNSIGNED_LONG,
    ES_FIELD_TYPES.HISTOGRAM,
  ];

  const timeSeriesFields: Array<{
    fieldName: string;
    type: string;
    typeInfo: FieldCapsFieldCapability;
    fieldType: 'metric' | 'dimension';
  }> = [];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    // Filter out metadata fields
    if (FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(fieldName)) continue;

    for (const [type, typeInfo] of Object.entries(fieldInfo)) {
      // Check for time series metrics (numeric fields with time_series_metric)
      if (numericTypes.includes(type as ES_FIELD_TYPES) && typeInfo.time_series_metric) {
        timeSeriesFields.push({ fieldName, type, typeInfo, fieldType: 'metric' });
      }
    }
  }

  return timeSeriesFields;
}
