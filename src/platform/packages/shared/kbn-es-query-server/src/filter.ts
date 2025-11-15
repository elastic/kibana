/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Validation Schemas for As Code Filter Interface
 *
 * These schemas are used for server validation of API requests and responses
 * in * as Code APIs.
 */

import { schema } from '@kbn/config-schema';
import { ASCODE_FILTER_OPERATOR } from '@kbn/es-query-constants';

// ====================================================================
// CORE FILTER OPERATOR AND VALUE SCHEMAS
// ====================================================================

/**
 * Schema for range values used in numeric and date filters
 */
const rangeSchema = schema.object({
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

// ====================================================================
// BASE PROPERTIES (SHARED BY ALL FILTERS)
// ====================================================================

/**
 * Base properties shared by all simplified filters
 */
const basePropertiesSchema = schema.object({
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
      meta: {
        description: 'Optional identifier for the component/plugin managing this filter',
      },
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
  isMultiIndex: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether this filter can be applied to multiple indices' },
    })
  ),
  filterType: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filter type from legacy filters (e.g., "spatial_filter", "query_string") for backwards compatibility',
      },
    })
  ),
  key: schema.maybe(
    schema.string({
      meta: {
        description: 'Field name metadata from legacy filters for backwards compatibility',
      },
    })
  ),
  value: schema.maybe(
    schema.string({
      meta: {
        description: 'Value metadata from legacy filters for backwards compatibility',
      },
    })
  ),
});

// ====================================================================
// FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Common field property for all filter conditions
 */
const conditionFieldSchema = schema.object({
  field: schema.string({ meta: { description: 'Field the filter applies to' } }),
});

/**
 * Schema for 'is' and 'is_not' operators with single value
 */
const singleConditionSchema = conditionFieldSchema.extends({
  operator: schema.oneOf(
    [schema.literal(ASCODE_FILTER_OPERATOR.IS), schema.literal(ASCODE_FILTER_OPERATOR.IS_NOT)],
    {
      meta: { description: 'Single value comparison operators' },
    }
  ),
  value: schema.oneOf([schema.string(), schema.number(), schema.boolean()], {
    meta: { description: 'Single value for comparison' },
  }),
});

/**
 * Schema for 'is_one_of' and 'is_not_one_of' operators with array values
 */
const oneOfConditionSchema = conditionFieldSchema.extends({
  operator: schema.oneOf(
    [
      schema.literal(ASCODE_FILTER_OPERATOR.IS_ONE_OF),
      schema.literal(ASCODE_FILTER_OPERATOR.IS_NOT_ONE_OF),
    ],
    {
      meta: { description: 'Array value comparison operators' },
    }
  ),
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
const rangeConditionSchema = conditionFieldSchema.extends({
  operator: schema.literal(ASCODE_FILTER_OPERATOR.RANGE),
  value: rangeSchema,
});

/**
 * Schema for 'exists' and 'not_exists' operators without value
 */
const existsConditionSchema = conditionFieldSchema.extends({
  operator: schema.oneOf(
    [
      schema.literal(ASCODE_FILTER_OPERATOR.EXISTS),
      schema.literal(ASCODE_FILTER_OPERATOR.NOT_EXISTS),
    ],
    {
      meta: { description: 'Field existence check operators' },
    }
  ),
  // value is intentionally omitted for exists/not_exists operators
});

/**
 * Discriminated union schema for simple filter conditions with proper operator/value type combinations
 */
const conditionSchema = schema.oneOf(
  [singleConditionSchema, oneOfConditionSchema, rangeConditionSchema, existsConditionSchema],
  { meta: { description: 'A filter condition with strict operator/value type matching' } }
);

// ====================================================================
// FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

interface RecursiveType {
  name: string;
  self: undefined | RecursiveType;
}

/**
 * Schema for condition filters
 */
export const asCodeConditionFilterSchema = basePropertiesSchema.extends(
  {
    condition: conditionSchema,
  },
  { meta: { description: 'Condition filter' } }
);

/**
 * Schema for logical filter groups with recursive structure
 * Uses lazy schema to handle recursive references
 */
const GROUP_FILTER_ID = '@kbn/es-query-server_groupFilter'; // package prefix for global uniqueness in OAS specs
export const asCodeGroupFilterSchema = basePropertiesSchema.extends(
  {
    group: schema.object(
      {
        type: schema.oneOf([schema.literal('and'), schema.literal('or')]),
        conditions: schema.arrayOf(
          schema.oneOf([
            conditionSchema,
            schema.lazy<RecursiveType>(GROUP_FILTER_ID), // Recursive reference for nested groups
          ])
        ),
      },
      { meta: { description: 'Condition or nested group filter', id: GROUP_FILTER_ID } }
    ),
  },
  { meta: { description: 'Grouped condition filter' } }
);

/**
 * Schema for DSL filters
 * Includes field and params properties specific to DSL filters for preserving metadata
 */
export const asCodeDSLFilterSchema = basePropertiesSchema.extends({
  dsl: schema.recordOf(schema.string(), schema.any(), {
    meta: { description: 'Elasticsearch Query DSL object' },
  }),
  field: schema.maybe(
    schema.string({
      meta: {
        description:
          'Field name from filter metadata (meta.field). Critical for scripted filters where field cannot be extracted from query.',
      },
    })
  ),
  params: schema.maybe(
    schema.any({
      meta: {
        description:
          'Filter parameters from metadata (meta.params). Preserves display values, formats, and script parameters.',
      },
    })
  ),
});

/**
 * Main discriminated union schema for Filter
 * Ensures exactly one of: condition, group, or dsl is present
 */
export const asCodeFilterSchema = schema.oneOf(
  [asCodeConditionFilterSchema, asCodeGroupFilterSchema, asCodeDSLFilterSchema],
  { meta: { description: 'A filter which can be a condition, group, or raw DSL' } }
);
