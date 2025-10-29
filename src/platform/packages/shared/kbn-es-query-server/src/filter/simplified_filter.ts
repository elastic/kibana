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
 * Supports single values, arrays, and range objects
 */
export const filterValueSchema = schema.oneOf(
  [
    schema.string(),
    schema.number(),
    schema.boolean(),
    schema.arrayOf(schema.oneOf([schema.string(), schema.number(), schema.boolean()])),
    rangeValueSchema,
  ],
  { meta: { description: 'Possible filter values that could be single values, arrays, or ranges' } }
);

// ====================================================================
// BASE FILTER PROPERTIES (SHARED BY ALL SIMPLIFIED FILTERS)
// ====================================================================

/**
 * Base properties shared by all simplified filters
 */
const baseFilterPropertiesSchema = {
  id: schema.maybe(
    schema.string({
      meta: { description: 'Unique identifier for the filter' },
    })
  ),
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
  indexPattern: schema.maybe(
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
 * Base schema for simple filter conditions
 */
const baseFilterConditionSchema = {
  field: schema.string({ meta: { description: 'Field the filter applies to' } }),
};

// ====================================================================
// DISCRIMINATED FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Schema for filter conditions that require a value
 */
export const filterConditionWithValueSchema = schema.object({
  ...baseFilterConditionSchema,
  operator: schema.oneOf(
    [
      schema.literal('is'),
      schema.literal('is_not'),
      schema.literal('is_one_of'),
      schema.literal('is_not_one_of'),
      schema.literal('range'),
    ],
    { meta: { description: 'Filter operators that require a value' } }
  ),
  value: filterValueSchema,
});

/**
 * Schema for filter conditions that check existence only
 */
export const filterConditionExistsSchema = schema.object({
  ...baseFilterConditionSchema,
  operator: schema.oneOf([schema.literal('exists'), schema.literal('not_exists')], {
    meta: { description: 'Filter operators that check existence' },
  }),
  // value is intentionally omitted for exists/not_exists operators
});

/**
 * Discriminated union schema for simple filter conditions
 */
export const simpleFilterConditionSchema = schema.oneOf(
  [filterConditionWithValueSchema, filterConditionExistsSchema],
  { meta: { description: 'A filter condition' } }
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
    type: schema.oneOf([schema.literal('AND'), schema.literal('OR')]),
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
// SIMPLIFIED FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

/**
 * Schema for simple condition filters (Tier 1)
 */
export const simplifiedConditionFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    condition: simpleFilterConditionSchema,
  },
  { meta: { description: 'Simple condition filter' } }
);

/**
 * Schema for grouped condition filters (Tier 2-3)
 */
export const simplifiedGroupFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    group: filterGroupSchema,
  },
  { meta: { description: 'Grouped condition filter' } }
);

/**
 * Schema for raw DSL filters (Tier 4)
 */
export const simplifiedDSLFilterSchema = schema.object(
  {
    ...baseFilterPropertiesSchema,
    dsl: rawDSLFilterSchema,
  },
  { meta: { description: 'Raw DSL filter' } }
);

/**
 * Main discriminated union schema for SimplifiedFilter
 * Ensures exactly one of: condition, group, or dsl is present
 */
export const simplifiedFilterSchema = schema.oneOf(
  [simplifiedConditionFilterSchema, simplifiedGroupFilterSchema, simplifiedDSLFilterSchema],
  { meta: { description: 'A filter which can be a condition, group, or raw DSL' } }
);
