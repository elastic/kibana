/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldBase, FieldTypeKnown } from '../types';

/**
 * Returns a field type. Time series metric type will override the original field type.
 * @param field
 */
export function getFieldType<T extends FieldBase = DataViewField>(field: T): FieldTypeKnown {
  const timeSeriesMetric = field.timeSeriesMetric;
  if (timeSeriesMetric) {
    return timeSeriesMetric;
  }
  return field.type ?? 'string';
}
