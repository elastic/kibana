/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListItem, FieldTypeKnown } from '../../types';

/**
 * Returns a field type. Time series metric type will override the original field type.
 * @param field
 */
export function getFieldType<T extends FieldListItem = DataViewField>(field: T): FieldTypeKnown {
  const timeSeriesMetric = field.timeSeriesMetric;
  if (timeSeriesMetric) {
    return timeSeriesMetric;
  }
  return field.type ?? 'string';
}
