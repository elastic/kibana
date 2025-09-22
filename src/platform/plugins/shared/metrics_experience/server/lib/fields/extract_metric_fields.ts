/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import type { MetricFieldType } from '../../../common/types';
import { getTimeSeriesFieldCapsGenerator } from './iterate_field_caps_generator';

export function extractMetricFields(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  const timeSeriesFields: Array<{
    fieldName: string;
    type: string;
    typeInfo: FieldCapsFieldCapability;
    fieldType: MetricFieldType;
  }> = [];

  for (const currentTimeSeriesFields of getTimeSeriesFieldCapsGenerator(fields, {
    batchSize: 500,
  })) {
    if (currentTimeSeriesFields.length > 0) {
      timeSeriesFields.push(
        ...currentTimeSeriesFields.map((f) => ({ ...f, fieldType: 'metric' as MetricFieldType }))
      );
    }
  }

  return timeSeriesFields;
}
