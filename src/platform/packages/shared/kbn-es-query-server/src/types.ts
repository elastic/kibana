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
  filterSchema,
  filterMetaSchema,
  globalStateSchema,
  appStateSchema,
} from './filter/stored_filter';
import type {
  simplifiedFilterSchema,
  simpleFilterConditionSchema,
  filterGroupSchema,
  rawDSLFilterSchema,
  filterOperatorSchema,
  filterValueSchema,
  rangeValueSchema,
} from './filter/simplified_filter';

export type TimeRange = Writable<TypeOf<typeof timeRangeSchema>>;
export type AbsoluteTimeRange = TypeOf<typeof absoluteTimeRangeSchema>;
export type RelativeTimeRange = TypeOf<typeof relativeTimeRangeSchema>;

export type Query = Writable<TypeOf<typeof querySchema>>;
export type AggregateQuery = Writable<TypeOf<typeof aggregateQuerySchema>>;

export type Filter = Writable<TypeOf<typeof filterSchema>>;
export type FilterMeta = Writable<TypeOf<typeof filterMetaSchema>>;

/**
 * Schema-inferred types for Simplified Filter API
 *
 * These types are inferred from validation schemas and provide runtime validation compatibility.
 */
export type SimplifiedFilter = Writable<TypeOf<typeof simplifiedFilterSchema>>;
export type SimpleFilterCondition = Writable<TypeOf<typeof simpleFilterConditionSchema>>;
export type FilterGroup = Writable<TypeOf<typeof filterGroupSchema>>;
export type RawDSLFilter = Writable<TypeOf<typeof rawDSLFilterSchema>>;
export type FilterOperator = Writable<TypeOf<typeof filterOperatorSchema>>;
export type FilterValue = Writable<TypeOf<typeof filterValueSchema>>;
export type RangeValue = Writable<TypeOf<typeof rangeValueSchema>>;
export type StoredFilterState = TypeOf<typeof appStateSchema> | TypeOf<typeof globalStateSchema>;
