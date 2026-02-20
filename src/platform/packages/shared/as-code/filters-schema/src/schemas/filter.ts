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

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  ASCODE_FILTER_OPERATOR,
  ASCODE_GROUPED_CONDITION_TYPE,
  ASCODE_FILTER_TYPE,
} from '@kbn/as-code-filters-constants';

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
  format: schema.maybe(
    schema.string({
      meta: {
        description:
          'Date format (e.g., strict_date_optional_time, strict_date_optional_time_nanos)',
      },
    })
  ),
});

// ====================================================================
// BASE PROPERTIES (SHARED BY ALL FILTERS)
// ====================================================================

/**
 * Negation property that can be used at the top-level of all filters or inside condition filters
 */
const negatePropertySchema = schema.maybe(
  schema.boolean({
    meta: { description: 'Whether to negate the filter.' },
  })
);

/**
 * Common top-level properties shared by all as code filters
 */
const commonBasePropertiesSchema = schema.object({
  disabled: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether the filter is disabled' },
    })
  ),
  negate: negatePropertySchema,
  controlled_by: schema.maybe(
    schema.string({
      meta: {
        description: 'Optional identifier for the component/plugin managing this filter',
      },
    })
  ),
  data_view_id: schema.maybe(
    schema.string({
      meta: { description: 'Data view ID that this filter applies to' },
    })
  ),
  label: schema.maybe(
    schema.string({
      meta: { description: 'Human-readable label for the filter' },
    })
  ),
  is_multi_index: schema.maybe(
    schema.boolean({
      meta: { description: 'Whether this filter can be applied to multiple indices' },
    })
  ),
});

// ====================================================================
// FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Common field property for all filter conditions
 */
const baseConditionSchema = schema.object({
  field: schema.string({ meta: { description: 'Field the filter applies to' } }),
  negate: negatePropertySchema,
});

/**
 * Schema for 'is' operator with single value
 */
const singleConditionSchema = baseConditionSchema.extends({
  operator: schema.literal(ASCODE_FILTER_OPERATOR.IS),
  value: schema.oneOf([schema.string(), schema.number(), schema.boolean()], {
    meta: { description: 'Single value for comparison' },
  }),
});

/**
 * Schema for 'is_one_of' operator with array values
 */
const oneOfConditionSchema = baseConditionSchema.extends({
  operator: schema.literal(ASCODE_FILTER_OPERATOR.IS_ONE_OF),
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
const rangeConditionSchema = baseConditionSchema.extends({
  operator: schema.literal(ASCODE_FILTER_OPERATOR.RANGE),
  value: rangeSchema,
});

/**
 * Schema for 'exists' operator without value
 */
const existsConditionSchema = baseConditionSchema.extends({
  operator: schema.literal(ASCODE_FILTER_OPERATOR.EXISTS),
  // value is intentionally omitted for exists operator
});

/**
 * Discriminated union schema for filter conditions
 */
const conditionSchema = schema.discriminatedUnion(
  'operator',
  [singleConditionSchema, oneOfConditionSchema, rangeConditionSchema, existsConditionSchema],
  { meta: { description: 'A filter condition with strict operator/value type matching' } }
);

// ====================================================================
// FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

interface RecursiveType {
  group: {
    operator: typeof ASCODE_GROUPED_CONDITION_TYPE.AND | typeof ASCODE_GROUPED_CONDITION_TYPE.OR;
    conditions: Array<TypeOf<typeof conditionSchema> | RecursiveType>;
  };
}

/**
 * Discriminated union schema combining all condition filter types
 */
export const asCodeConditionFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.CONDITION),
    condition: conditionSchema,
  },
  { meta: { description: 'Condition filter' } }
);

/**
 * Schema for logical filter groups with recursive structure
 * Uses lazy schema to handle recursive references
 */
const GROUP_FILTER_ID = '@kbn/as-code-filters-schema_groupFilter'; // package prefix for global uniqueness in OAS specs
export const asCodeGroupFilterSchema = commonBasePropertiesSchema.extends(
  {
    type: schema.literal(ASCODE_FILTER_TYPE.GROUP),
    group: schema.object(
      {
        operator: schema.oneOf([
          schema.literal(ASCODE_GROUPED_CONDITION_TYPE.AND),
          schema.literal(ASCODE_GROUPED_CONDITION_TYPE.OR),
        ]),
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
export const asCodeDSLFilterSchema = commonBasePropertiesSchema.extends({
  type: schema.literal(ASCODE_FILTER_TYPE.DSL),
  dsl: schema.recordOf(schema.string(), schema.any(), {
    meta: { description: 'Elasticsearch Query DSL object' },
  }),
  field: schema.maybe(
    schema.string({
      meta: {
        description: 'Field name for scripted filters where field cannot be extracted from query.',
      },
    })
  ),
  params: schema.maybe(
    schema.any({
      meta: {
        description:
          'Filter parameters metadata. May contain display values, formats, and parameters for scripted filters.',
      },
    })
  ),
});

/**
 * Schema for spatial filters
 * Similar to DSL filters but with type='spatial' to preserve spatial_filter meta.type
 */
export const asCodeSpatialFilterSchema = commonBasePropertiesSchema.extends({
  type: schema.literal(ASCODE_FILTER_TYPE.SPATIAL),
  dsl: schema.recordOf(schema.string(), schema.any(), {
    meta: { description: 'Elasticsearch geo query DSL object' },
  }),
});

/**
 * Main discriminated union schema for Filter
 * Uses 'type' as discriminator to validate condition, group, dsl, or spatial filters
 */
export const asCodeFilterSchema = schema.discriminatedUnion(
  'type',
  [
    asCodeConditionFilterSchema,
    asCodeGroupFilterSchema,
    asCodeDSLFilterSchema,
    asCodeSpatialFilterSchema,
  ],
  { meta: { description: 'A filter which can be a condition, group, DSL, or spatial' } }
);
