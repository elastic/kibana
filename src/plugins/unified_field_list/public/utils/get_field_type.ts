/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldListItem, FieldTypeForFilter } from '../types';

// TODO: add tests
export function getFieldType<T extends FieldListItem = DataViewField>(
  field: T
): FieldTypeForFilter {
  const timeSeriesMetric = field.timeSeriesMetric;
  if (timeSeriesMetric) {
    return timeSeriesMetric as FieldTypeForFilter;
  }
  return field.type as FieldTypeForFilter;
}

export function getFieldIconType<T extends FieldListItem = DataViewField>(field: T): string {
  const type = getFieldType<T>(field);
  const esType = field.esTypes?.[0] || null;
  if (esType && ['_id', '_index'].includes(esType)) {
    return type;
  }
  return type === 'string' && esType ? esType : type;
}
