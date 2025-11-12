/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { timeRangeSchema } from './src/time_range';
export { querySchema } from './src/query';
export { asCodeFilterSchema } from './src/filter';
export { storedFilterSchema } from './src/stored_filter';

// Re-export filter operator constants for server-side use
export {
  SIMPLE_FILTER_OPERATOR,
  FILTER_OPERATORS,
  type FilterOperator,
} from '@kbn/es-query-constants';

export type {
  TimeRange,
  AbsoluteTimeRange,
  RelativeTimeRange,
  AggregateQuery,
  Query,
  AsCodeFilter,
} from './src/types';
