/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/public';

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export const fieldSupportsBreakdown = (field: DataViewField) =>
  supportedTypes.has(field.type) &&
  field.aggregatable &&
  !field.scripted &&
  field.timeSeriesMetric !== 'counter';
