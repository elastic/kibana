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
 * This module provides @kbn/config-schema validation schemas that correspond
 * to the TypeScript types defined in simplified_filter_types.ts.
 *
 * These schemas are used for runtime validation of API requests and responses
 * in * as Code APIs.
 */

import { schema } from '@kbn/config-schema';

// ====================================================================
// CORE FILTER OPERATOR AND VALUE SCHEMAS
// ====================================================================

/**
 * Schema for supported filter operators
 */
export const filterOperatorSchema = schema.oneOf([
  schema.literal('is'),
  schema.literal('is_not'),
  schema.literal('is_one_of'),
  schema.literal('is_not_one_of'),
  schema.literal('exists'),
  schema.literal('not_exists'),
  schema.literal('range'),
]);

/**
 * Schema for range values used in numeric and date filters
 */
export const rangeValueSchema = schema.object({
  gte: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  lte: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  gt: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  lt: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
});

/**
 * Schema for all possible filter values
 * Supports single values, arrays, and range objects
 */
export const filterValueSchema = schema.oneOf([
  schema.string(),
  schema.number(),
  schema.boolean(),
  schema.arrayOf(schema.oneOf([schema.string(), schema.number(), schema.boolean()])),
  rangeValueSchema,
]);

// ====================================================================
// BASE FILTER PROPERTIES (SHARED BY ALL SIMPLIFIED FILTERS)
// ====================================================================

/**
 * Base properties shared by all simplified filters
 */
const baseFilterPropertiesSchema = {
  id: schema.maybe(schema.string()),
  pinned: schema.maybe(schema.boolean()),
  disabled: schema.maybe(schema.boolean()),
  controlledBy: schema.maybe(schema.string()),
  indexPattern: schema.maybe(schema.string()),
  negate: schema.maybe(schema.boolean()),
  label: schema.maybe(schema.string()),
};

// ====================================================================
// SIMPLE FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Base schema for simple filter conditions
 */
const baseFilterConditionSchema = {
  field: schema.string(),
};

// ====================================================================
// DISCRIMINATED FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Schema for filter conditions that require a value
 */
export const filterConditionWithValueSchema = schema.object({
  ...baseFilterConditionSchema,
  operator: schema.oneOf([
    schema.literal('is'),
    schema.literal('is_not'),
    schema.literal('is_one_of'),
    schema.literal('is_not_one_of'),
    schema.literal('range'),
  ]),
  value: filterValueSchema,
});

/**
 * Schema for filter conditions that check existence only
 */
export const filterConditionExistsSchema = schema.object({
  ...baseFilterConditionSchema,
  operator: schema.oneOf([schema.literal('exists'), schema.literal('not_exists')]),
  // value is intentionally omitted for exists/not_exists operators
});

/**
 * Discriminated union schema for simple filter conditions
 */
export const simpleFilterConditionSchema = schema.oneOf([
  filterConditionWithValueSchema,
  filterConditionExistsSchema,
]);

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
  { meta: { id: 'filterGroup' } }
);

// ====================================================================
// RAW DSL FILTER SCHEMA
// ====================================================================

/**
 * Schema for raw Elasticsearch Query DSL filters
 */
export const rawDSLFilterSchema = schema.object({
  query: schema.recordOf(schema.string(), schema.any()),
});

// ====================================================================
// SIMPLIFIED FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

/**
 * Schema for simple condition filters (Tier 1)
 */
export const simplifiedConditionFilterSchema = schema.object({
  ...baseFilterPropertiesSchema,
  condition: simpleFilterConditionSchema,
});

/**
 * Schema for grouped condition filters (Tier 2-3)
 */
export const simplifiedGroupFilterSchema = schema.object({
  ...baseFilterPropertiesSchema,
  group: filterGroupSchema,
});

/**
 * Schema for raw DSL filters (Tier 4)
 */
export const simplifiedDSLFilterSchema = schema.object({
  ...baseFilterPropertiesSchema,
  dsl: rawDSLFilterSchema,
});

/**
 * Main discriminated union schema for SimplifiedFilter
 * Ensures exactly one of: condition, group, or dsl is present
 */
export const simplifiedFilterSchema = schema.oneOf([
  simplifiedConditionFilterSchema,
  simplifiedGroupFilterSchema,
  simplifiedDSLFilterSchema,
]);
