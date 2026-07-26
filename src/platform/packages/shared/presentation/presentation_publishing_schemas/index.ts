/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SerializedTimeRange, SerializedTitles } from './src/types';
export { serializedTimeRangeSchema } from './src/time_range_schema';
export { serializedTitlesSchema } from './src/titles_schema';

export const BY_REF_SCHEMA_META = {
  description: 'Panel configuration stored in a linked library item',
  title: 'By reference',
};

export const BY_VALUE_SCHEMA_META = {
  description: 'Panel configuration stored inline',
  title: 'By value',
};
