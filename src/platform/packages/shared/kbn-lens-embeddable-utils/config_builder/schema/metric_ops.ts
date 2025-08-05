/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { filterSchema } from './filter';
import { formatSchema } from './format';

const genericOperationOptionsSchema = schema.object({
  /**
   * Label for the operation
   */
  label: schema.maybe(
    schema.string({
      meta: {
        description: 'Label for the operation',
      },
    })
  ),
  ...formatSchema.getPropSchemas(),
});

export const staticOperationDefinitionSchema = schema.object({
  operation: schema.literal('static_value'),
  /**
   * Static value
   */
  value: schema.number({
    meta: {
      description: 'Static value',
    },
  }),
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const formulaOperationDefinitionSchema = schema.object({
  operation: schema.literal('formula'),
  /**
   * Formula
   */
  formula: schema.string({
    meta: {
      description: 'Formula',
    },
  }),
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const metricOperationSharedSchema = schema.object({
  /**
   * Time scale
   */
  time_scale: schema.maybe(
    schema.oneOf(
      [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
      { meta: { description: 'Time scale' } }
    )
  ),
  /**
   * Reduced time range
   */
  reduced_time_range: schema.maybe(schema.string({ meta: { description: 'Reduced time range' } })),
  /**
   * Time shift
   */
  time_shift: schema.maybe(schema.string({ meta: { description: 'Time shift' } })),
  /**
   * Filter
   */
  filter: schema.maybe(filterSchema),
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const fieldBasedOperationSharedSchema = schema.object({
  /**
   * Field to be used for the metric
   */
  field: schema.string({ meta: { description: 'Field to be used for the metric' } }),
  ...metricOperationSharedSchema.getPropSchemas(),
});

const emptyAsNullSchema = schema.object({
  /**
   * Whether to consider null values as null
   */
  empty_as_null: schema.maybe(
    schema.boolean({
      meta: {
        description: 'Whether to consider null values as null',
      },
    })
  ),
});

export const countMetricOperationSchema = schema.object({
  /**
   * Select the operation type
   */
  operation: schema.literal('count'),
  /**
   * Field to be used for the metric
   */
  field: schema.maybe(schema.string()),
  ...metricOperationSharedSchema.getPropSchemas(),
  ...emptyAsNullSchema.getPropSchemas(),
});

export const uniqueCountMetricOperationSchema = schema.object({
  operation: schema.literal('unique_count'),
  ...fieldBasedOperationSharedSchema.getPropSchemas(),
  ...emptyAsNullSchema.getPropSchemas(),
});

export const metricOperationSchema = schema.object({
  operation: schema.oneOf([
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('sum'),
    schema.literal('median'),
  ]),
  ...fieldBasedOperationSharedSchema.getPropSchemas(),
});

export const lastValueOperationSchema = schema.object({
  operation: schema.literal('last_value'),
  ...fieldBasedOperationSharedSchema.getPropSchemas(),
});

export const percentileOperationSchema = schema.object({
  operation: schema.literal('percentile'),
  percentile: schema.number({ meta: { description: 'Percentile' } }),
  ...fieldBasedOperationSharedSchema.getPropSchemas(),
});

export const percentileRanksOperationSchema = schema.object({
  operation: schema.literal('percentile_ranks'),
  ranks: schema.arrayOf(schema.number({ meta: { description: 'Rank' } })),
  ...fieldBasedOperationSharedSchema.getPropSchemas(),
});

export const fieldMetricOperationsSchema = schema.oneOf([
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export const differencesOperationSchema = schema.object({
  operation: schema.literal('differences'),
  of: fieldMetricOperationsSchema,
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const movingAverageOperationSchema = schema.object({
  operation: schema.literal('moving_average'),
  of: fieldMetricOperationsSchema,
  window: schema.number({ meta: { description: 'Window' } }),
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const cumulativeSumOperationSchema = schema.object({
  operation: schema.literal('cumulative_sum'),
  of: fieldMetricOperationsSchema,
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const counterRateOperationSchema = schema.object({
  operation: schema.literal('counter_rate'),
  of: fieldMetricOperationsSchema,
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const valueOperationSchema = schema.object({
  operation: schema.literal('value'),
  column: schema.string({ meta: { description: 'Value' } }),
  ...genericOperationOptionsSchema.getPropSchemas(),
});

export const metricOperationDefinitionSchema = schema.oneOf([
  formulaOperationDefinitionSchema,
  staticOperationDefinitionSchema,
  fieldMetricOperationsSchema,
  differencesOperationSchema,
  movingAverageOperationSchema,
  cumulativeSumOperationSchema,
  counterRateOperationSchema,
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export type LensApiMetricOperations = typeof metricOperationDefinitionSchema.type;
export type LensApiFieldMetricOperations = typeof fieldMetricOperationsSchema.type;

export type LensApiCountMetricOperation = typeof countMetricOperationSchema.type;
export type LensApiUniqueCountMetricOperation = typeof uniqueCountMetricOperationSchema.type;
export type LensApiMetricOperation = typeof metricOperationSchema.type;
export type LensApiLastValueOperation = typeof lastValueOperationSchema.type;
export type LensApiPercentileOperation = typeof percentileOperationSchema.type;
export type LensApiPercentileRanksOperation = typeof percentileRanksOperationSchema.type;
export type LensApiDifferencesOperation = typeof differencesOperationSchema.type;
export type LensApiMovingAverageOperation = typeof movingAverageOperationSchema.type;
export type LensApiCumulativeSumOperation = typeof cumulativeSumOperationSchema.type;
export type LensApiCounterRateOperation = typeof counterRateOperationSchema.type;
export type LensApiFormulaOperation = typeof formulaOperationDefinitionSchema.type;
export type LensApiStaticValueOperation = typeof staticOperationDefinitionSchema.type;
export type LensApiValueOperation = typeof valueOperationSchema.type;
