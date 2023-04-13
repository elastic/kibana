/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField } from '@kbn/data-views-plugin/public';

const supportedTypes = new Set(['string', 'boolean', 'number', 'ip']);

export const fieldSupportsBreakdown = (field: DataViewField) =>
  supportedTypes.has(field.type) && field.aggregatable && !field.scripted;
