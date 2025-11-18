/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type DataViewField } from '@kbn/data-views-plugin/common';
import { KNOWN_FIELD_TYPES } from './field_types';

const supportedTypes = new Set([
  KNOWN_FIELD_TYPES.STRING,
  KNOWN_FIELD_TYPES.BOOLEAN,
  KNOWN_FIELD_TYPES.NUMBER,
  KNOWN_FIELD_TYPES.IP,
]);

export const fieldSupportsBreakdown = (field: DataViewField) =>
  supportedTypes.has(field.type as KNOWN_FIELD_TYPES) &&
  field.aggregatable &&
  !field.scripted &&
  field.timeSeriesMetric !== 'counter';
