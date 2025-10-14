/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import { NUMERIC_TYPES } from '../../../common/fields/constants';

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

function* batchGenerator<T>(gen: Generator<T>, batchSize: number): Generator<T[]> {
  let batch: T[] = [];

  for (const item of gen) {
    batch.push(item);
    if (batch.length === batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

function* timeseriesFieldCapsGenerator(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  for (const fieldName in fields) {
    if (FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(fieldName)) continue;

    const capabilities = fields[fieldName];
    for (const type in capabilities) {
      if (!(type in capabilities)) continue;

      const typeInfo = capabilities[type];

      if (NUMERIC_TYPES.includes(type as ES_FIELD_TYPES) && typeInfo.time_series_metric) {
        yield { fieldName, type, typeInfo };
      }
    }
  }
}

export const getTimeSeriesFieldCapsGenerator = (
  fields: Record<string, Record<string, FieldCapsFieldCapability>>,
  { batchSize }: { batchSize: number } = { batchSize: 100 }
) => batchGenerator(timeseriesFieldCapsGenerator(fields), batchSize);
