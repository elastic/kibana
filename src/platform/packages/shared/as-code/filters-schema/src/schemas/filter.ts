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

import { z } from '@kbn/zod';
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
const rangeSchema = z
  .object({
    gte: z
      .union([z.number(), z.string()])
      .optional()
      .meta({ description: 'Greater than or equal to.' }),
    lte: z
      .union([z.number(), z.string()])
      .optional()
      .meta({ description: 'Less than or equal to.' }),
    gt: z.union([z.number(), z.string()]).optional().meta({ description: 'Greater than.' }),
    lt: z.union([z.number(), z.string()]).optional().meta({ description: 'Less than.' }),
    format: z.string().optional().meta({
      description:
        'Elasticsearch [date format](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-date-format) string applied when parsing date boundary values. For example, `strict_date_optional_time` or `epoch_millis`.',
    }),
  })
  .strict()
  .meta({
    description: 'Boundary values for a range comparison.',
  });

// ====================================================================
// BASE PROPERTIES (SHARED BY ALL FILTERS)
// ====================================================================

/**
 * Negation property that can be used at the top-level of all filters or inside condition filters
 */
const negatePropertySchema = z.boolean().optional().meta({
  description:
    'When `true`, the filter is negated and matches documents that do NOT satisfy the condition. Defaults to `false`.',
});

/**
 * Common top-level properties shared by all as code filters
 */
const commonBasePropertiesSchema = z
  .object({
    disabled: z.boolean().optional().meta({
      description:
        'When `true`, the filter is inactive and does not affect query results. Defaults to `false`.',
    }),
    negate: negatePropertySchema,
    controlled_by: z.string().optional().meta({
      description:
        'Identifier of the panel that manages this filter. When set, the filter is treated as owned by that panel.',
    }),
    data_view_id: z.string().optional().meta({
      description: 'Identifier of the data view used as context for this filter.',
    }),
    label: z
      .string()
      .optional()
      .meta({ description: 'Human-readable label for the filter, used for display purposes.' }),
    is_multi_index: z.boolean().optional().meta({
      description:
        'When `true`, the filter can be applied across multiple indices. Defaults to `false`.',
    }),
  })
  .strict();

// ====================================================================
// FILTER CONDITION SCHEMAS
// ====================================================================

/**
 * Common field property for all filter conditions
 */
const baseConditionSchema = z
  .object({
    field: z.string().meta({ description: 'Name of the document field the condition evaluates.' }),
    negate: negatePropertySchema,
  })
  .strict();

/**
 * Schema for 'is' operator with single value
 */
const singleConditionSchema = baseConditionSchema
  .extend({
    operator: z.literal(ASCODE_FILTER_OPERATOR.IS),
    value: z
      .union([
        z.string().meta({
          title: 'value',
        }),
        z.number().meta({
          title: 'value',
        }),
        z.boolean().meta({
          title: 'value',
        }),
      ])
      .meta({ description: 'Single value to compare against the field.' }),
  })
  .meta({
    description: 'Matches documents where `field` equals a single specified value.',
    title: ASCODE_FILTER_OPERATOR.IS,
    id: 'kbn-as-code-filters-schema_condition_is',
  });

/**
 * Schema for 'is_one_of' operator with array values
 */
const oneOfConditionSchema = baseConditionSchema
  .extend({
    operator: z.literal(ASCODE_FILTER_OPERATOR.IS_ONE_OF),
    value: z
      .union([
        z.array(z.string()).max(10000),
        z.array(z.number()).max(10000),
        z.array(z.boolean()).max(10000),
      ])
      .meta({
        description: 'Homogeneous array of values to match against the field.',
      }),
  })
  .meta({
    description: 'Matches documents where `field` equals any value in a provided list.',
    title: ASCODE_FILTER_OPERATOR.IS_ONE_OF,
    id: 'kbn-as-code-filters-schema_condition_is_one_of',
  });

/**
 * Schema for 'range' operator with range value
 */
const rangeConditionSchema = baseConditionSchema
  .extend({
    operator: z.literal(ASCODE_FILTER_OPERATOR.RANGE),
    value: rangeSchema,
  })
  .meta({
    description: 'Matches documents where `field` falls within a specified numeric or date range.',
    title: ASCODE_FILTER_OPERATOR.RANGE,
    id: 'kbn-as-code-filters-schema_condition_range',
  });

/**
 * Schema for 'exists' operator without value
 */
const existsConditionSchema = baseConditionSchema
  .extend({
    operator: z.literal(ASCODE_FILTER_OPERATOR.EXISTS),
    // value is intentionally omitted for exists operator
  })
  .meta({
    description: 'Matches documents where `field` exists and contains a non-null value.',
    title: ASCODE_FILTER_OPERATOR.EXISTS,
    id: 'kbn-as-code-filters-schema_condition_exists',
  });

/**
 * Discriminated union schema for filter conditions
 */
const conditionSchema = z
  .discriminatedUnion('operator', [
    singleConditionSchema,
    oneOfConditionSchema,
    rangeConditionSchema,
    existsConditionSchema,
  ])
  .meta({
    description: 'A filter condition with strict operator/value type matching.',
    id: 'kbn-as-code-filters-schema_conditionSchema',
  });

// ====================================================================
// FILTER DISCRIMINATED UNION SCHEMA
// ====================================================================

export interface AsCodeGroupFilterRecursive {
  operator: typeof ASCODE_GROUPED_CONDITION_TYPE.AND | typeof ASCODE_GROUPED_CONDITION_TYPE.OR;
  conditions: Array<z.output<typeof conditionSchema> | AsCodeGroupFilterRecursive>;
}

/**
 * Discriminated union schema combining all condition filter types
 */
export const asCodeConditionFilterSchema = commonBasePropertiesSchema
  .extend({
    type: z.literal(ASCODE_FILTER_TYPE.CONDITION),
    condition: conditionSchema,
  })
  .meta({
    description:
      'A filter that evaluates a single field condition such as equality, range, or existence.',
    title: ASCODE_FILTER_TYPE.CONDITION,
    id: 'kbn-as-code-filters-schema_asCodeConditionFilterSchema',
  });

// Inner group shape (recursing shape)
const groupConditionSchema: z.ZodType<AsCodeGroupFilterRecursive> = z
  .object({
    operator: z
      .union([
        z.literal(ASCODE_GROUPED_CONDITION_TYPE.AND),
        z.literal(ASCODE_GROUPED_CONDITION_TYPE.OR),
      ])
      .meta({
        description:
          'Logical operator applied across all entries in `conditions`. Use `and` to require all conditions, or `or` to require at least one.',
      }),
    conditions: z.array(z.union([conditionSchema, z.lazy(() => groupConditionSchema)])).meta({
      description: 'Ordered list of conditions or nested groups combined by the group `operator`.',
    }),
  })
  .strict()
  .meta({
    description: 'Logical group that combines one or more conditions or nested groups.',
    id: 'kbn-as-code-filters-schema_groupConditionSchema',
  });

export const asCodeGroupFilterSchema = commonBasePropertiesSchema
  .extend({
    type: z.literal(ASCODE_FILTER_TYPE.GROUP),
    group: groupConditionSchema,
  })
  .meta({
    description:
      'A filter that combines multiple conditions or nested groups using a logical `and` or `or` operator.',
    title: ASCODE_FILTER_TYPE.GROUP,
    id: 'kbn-as-code-filters-schema_asCodeGroupFilterSchema',
  });
/**
 * Schema for DSL filters
 * Includes field and params properties specific to DSL filters for preserving metadata
 */
export const asCodeDSLFilterSchema = commonBasePropertiesSchema
  .extend({
    type: z.literal(ASCODE_FILTER_TYPE.DSL),
    dsl: z.record(z.string(), z.any()).meta({
      description: 'Elasticsearch Query DSL object passed directly to the query.',
    }),
    field: z.string().optional().meta({
      description:
        'Field name for scripted filters where the field cannot be extracted from the DSL query.',
    }),
    params: z.any().optional().meta({
      description:
        'Filter parameters metadata. May contain display values, formats, and parameters for scripted filters.',
    }),
  })
  .meta({
    description:
      'A filter expressed as a raw [Elasticsearch Query DSL](https://www.elastic.co/docs/reference/query-languages/querydsl) object, used for queries that cannot be represented by condition or group filters.',
    title: ASCODE_FILTER_TYPE.DSL,
    id: 'kbn-as-code-filters-schema_asCodeDSLFilterSchema',
  });

/**
 * Schema for spatial filters
 * Similar to DSL filters but with type='spatial' to preserve spatial_filter meta.type
 */
export const asCodeSpatialFilterSchema = commonBasePropertiesSchema
  .extend({
    type: z.literal(ASCODE_FILTER_TYPE.SPATIAL),
    dsl: z.record(z.string(), z.any()).meta({
      description: 'Elasticsearch geo query DSL object.',
    }),
  })
  .meta({
    description:
      'A filter that applies an Elasticsearch geo query, used for geographic boundary and shape matching.',
    title: ASCODE_FILTER_TYPE.SPATIAL,
    id: 'kbn-as-code-filters-schema_asCodeSpatialFilterSchema',
  });

/**
 * Main discriminated union schema for Filter
 * Uses 'type' as discriminator to validate condition, group, dsl, or spatial filters
 */
export const asCodeFilterSchema = z
  .discriminatedUnion('type', [
    asCodeConditionFilterSchema,
    asCodeGroupFilterSchema,
    asCodeDSLFilterSchema,
    asCodeSpatialFilterSchema,
  ])
  .meta({
    description:
      'A filter applied to query results. Can be a field condition (`condition`), a logical group of conditions (`group`), a raw Elasticsearch DSL query (`dsl`), or a geo spatial query (`spatial`).',
    id: 'kbn-as-code-filters-schema_asCodeFilterSchema',
  });
