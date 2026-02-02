/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { Writable } from '@kbn/utility-types';
import type {
  timeRangeSchema,
  absoluteTimeRangeSchema,
  relativeTimeRangeSchema,
} from './time_range';
import type { aggregateQuerySchema, querySchema } from './query';
import type {
  asCodeFilterSchema,
  asCodeConditionFilterSchema,
  asCodeGroupFilterSchema,
  asCodeDSLFilterSchema,
} from './filter';

export type TimeRange = Writable<TypeOf<typeof timeRangeSchema>>;
export type AbsoluteTimeRange = TypeOf<typeof absoluteTimeRangeSchema>;
export type RelativeTimeRange = TypeOf<typeof relativeTimeRangeSchema>;

export type Query = Writable<TypeOf<typeof querySchema>>;
export type AggregateQuery = Writable<TypeOf<typeof aggregateQuerySchema>>;

/**
 * Schema-inferred types for As Code Filter API
 *
 * These types are inferred from validation schemas and provide runtime validation compatibility.
 */
export type AsCodeFilter = Writable<TypeOf<typeof asCodeFilterSchema>>;
export type AsCodeConditionFilter = Writable<TypeOf<typeof asCodeConditionFilterSchema>>;
export type AsCodeGroupFilter = Writable<TypeOf<typeof asCodeGroupFilterSchema>>;
export type AsCodeDSLFilter = Writable<TypeOf<typeof asCodeDSLFilterSchema>>;
