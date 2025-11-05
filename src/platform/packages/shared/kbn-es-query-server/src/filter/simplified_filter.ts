/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validation Schemas for Simplified Filter Interface
 *
 * These schemas are used for server validation of API requests and responses
 * in * as Code APIs.
 */

import { schema } from '@kbn/config-schema';

// ====================================================================
// CORE FILTER OPERATOR AND VALUE SCHEMAS
// ====================================================================

/**
 * Schema for range values used in numeric and date filters
 */
export const rangeValueSchema = schema.object({
  gte: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Greater than or equal to' },
    })
  ),
  lte: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Less than or equal to' },
    })
  ),
  gt: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Greater than' },
    })
  ),
  lt: schema.maybe(
    schema.oneOf([schema.number(), schema.string()], {
      meta: { description: 'Less than' },
    })
  ),
});

/**
 * Schema for all possible filter values
 */
export const filterValueSchema = schema.oneOf(
  [
    schema.string(),
    schema.number(),
    schema.boolean(),
    schema.arrayOf(schema.string()),
    schema.arrayOf(schema.number()),
    schema.arrayOf(schema.boolean()),
    rangeValueSchema,
  ],
  { meta: { description: 'Filter value - single value, array of homogeneous values, or range' } }
);

// ====================================================================
// BASE FILTER PROPERTIES (SHARED BY ALL SIMPLIFIED FILTERS)
// ====================================================================

/**
 * Base properties shared by all simplified filters
 */
const baseFilterPropertiesSchema = {
  pinned: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the filter is pinned' },
    })
  ),
  disabled: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the filter is disabled' },
    })
  ),
  controlledBy: schema.maybe(
    schema.string({
      meta: { description: 'Owner that manages this filter' },
    })
  ),
  dataViewId: schema.maybe(
    schema.string({
      meta: { description: 'Data view ID that this filter applies to' },
    })
  ),
  negate: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether to negate the filter condition' },
    })
  ),
  label: schema.maybe(
    schema.string({
      meta: { description: 'Human-readable label for the filter' },
    })
  ),
};

// ====================================================================
// SIMPLE FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Common field property for all filter conditions
 */
const filterConditionFieldSchema = {
  field: schema.string({ meta: { description: 'Field the filter applies to' } }),
};

/**
 * Schema for 'is' and 'is_not' operators with single value
 */
const filterConditionIsSingleSchema = schema.object({
  ...filterConditionFieldSchema,
  operator: schema.oneOf([schema.literal('is'), schema.literal('is_not')], {
    meta: { description: 'Single value comparison operators' },
  }),
  value: schema.oneOf([schema.string(), schema.number(), schema.boolean()], {
    meta: { description: 'Single value for comparison' },
  }),
});

/**
 * Schema for 'is_one_of' and 'is_not_one_of' operators with array values
 */
const filterConditionIsOneOfSchema = schema.object({
  ...filterConditionFieldSchema,
  operator: schema.oneOf([schema.literal('is_one_of'), schema.literal('is_not_one_of')], {
    meta: { description: 'Array value comparison operators' },
  }),
  value: schema.oneOf(
    [
      schema.arrayOf(schema.string()),
      schema.arrayOf(schema.number()),
      schema.arrayOf(schema.boolean()),
    ],
    { meta: { description: 'Homogeneous array of values' } }
  ),
});

/**
 * Schema for 'range' operator with range value
 */
const filterConditionRangeSchema = schema.object({
  ...filterConditionFieldSchema,
  operator: schema.literal('range'),
  value: rangeValueSchema,
});

/**
 * Schema for 'exists' and 'not_exists' operators without value
 */
const filterConditionExistsSchema = schema.object({
  ...filterConditionFieldSchema,
  operator: schema.oneOf([schema.literal('exists'), schema.literal('not_exists')], {
    meta: { description: 'Field existence check operators' },
  }),
  // value is intentionally omitted for exists/not_exists operators
});

/**
 * Discriminated union schema for simple filter conditions with proper operator/value type combinations
 */
export const simpleFilterConditionSchema = schema.oneOf(
  [
    filterConditionIsSingleSchema,
    filterConditionIsOneOfSchema,
    filterConditionRangeSchema,
    filterConditionExistsSchema,
  ],
  { meta: { description: 'A filter condition with strict operator/value type matching' } }
);

// ====================================================================
// FILTER GROUP SCHEMA (RECURSIVE)
// ====================================================================

/**
 * Schema for logical filter groups with recursive structure
 * Uses lazy schema to handle recursive references
 * Note: Groups only contain logical structure (type, conditions) - no metadata properties
 */
export const filterGroupSchema = schema.object(
  {
    type: schema.oneOf([schema.literal('and'), schema.literal('or')]),
    conditions: schema.arrayOf(
      schema.oneOf([
        simpleFilterConditionSchema,
        schema.lazy('filterGroup'), // Recursive reference
      ])
    ),
  },
  { meta: { description: 'Grouped filters', id: 'filterGroup' } }
);

// ====================================================================
// RAW DSL FILTER SCHEMA
// ====================================================================

/**
 * Schema for raw Elasticsearch Query DSL filters
 */
export const rawDSLFilterSchema = schema.object({
  query: schema.recordOf(schema.string(), schema.any(), {
    meta: { description: 'Elasticsearch Query DSL object' },
  }),
});

// ====================================================================
// SIMPLE FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

/**
 * Schema for simple condition filters (Tier 1)
 */
export const simpleConditionFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    condition: simpleFilterConditionSchema,
  },
  { meta: { description: 'Simple condition filter' } }
);

/**
 * Schema for grouped condition filters (Tier 2-3)
 */
export const simpleGroupFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    group: filterGroupSchema,
  },
  { meta: { description: 'Grouped condition filter' } }
);

/**
 * Schema for raw DSL filters (Tier 4)
 */
export const simpleDSLFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    dsl: rawDSLFilterSchema,
  },
  { meta: { description: 'Raw DSL filter' } }
);

/**
 * Main discriminated union schema for SimpleFilter
 * Ensures exactly one of: condition, group, or dsl is present
 */
export const simpleFilterSchema = schema.oneOf(
  [simpleConditionFilterSchema, simpleGroupFilterSchema, simpleDSLFilterSchema],
  { meta: { description: 'A filter which can be a condition, group, or raw DSL' } }
);
