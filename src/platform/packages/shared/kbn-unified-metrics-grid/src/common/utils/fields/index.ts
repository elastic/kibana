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
import { NUMERIC_TYPES } from '../../constants';

export const isMetricField = (fieldType: string, typeCaps: FieldCapsFieldCapability): boolean =>
  Boolean(typeCaps.time_series_metric) || NUMERIC_TYPES.includes(fieldType as ES_FIELD_TYPES);

export const hasValue = (value: unknown): boolean => {
  if (value == null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some((v) => v != null);
  }
  return true;
};

export type FieldSpecId = `${string}>${string}`;
export const buildFieldSpecId = (index: string, fieldName: string): FieldSpecId => {
  return `${index}>${fieldName}`;
};
