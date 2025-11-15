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
import {
  LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
  LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  LENS_STATIC_VALUE_DEFAULT,
} from './constants';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../transforms/columns/utils';

export const genericOperationOptionsSchema = {
  ...formatSchema,
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
};

export const staticOperationDefinitionSchema = schema.object({
  ...genericOperationOptionsSchema,
  operation: schema.literal('static_value'),
  /**
   * Static value
   */
  value: schema.number({
    meta: {
      description: 'Static value',
    },
    defaultValue: LENS_STATIC_VALUE_DEFAULT,
  }),
});

export const formulaOperationDefinitionSchema = schema.object({
  ...genericOperationOptionsSchema,
  operation: schema.literal('formula'),
  /**
   * Formula
   */
  formula: schema.string({
    meta: {
      description: 'Formula',
    },
  }),
  /**
   * Filter
   */
  filter: schema.maybe(filterSchema),
  /**
   * Reduced time range
   */
  reduced_time_range: schema.maybe(schema.string({ meta: { description: 'Reduced time range' } })),
});

export const esqlColumnSchema = schema.object({
  /**
   * Value
   */
  operation: schema.literal('value'),
  column: schema.string({
    meta: {
      description: 'Column to use',
    },
  }),
});

export const metricOperationSharedSchema = {
  ...genericOperationOptionsSchema,
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
};

export const fieldBasedOperationSharedSchema = {
  ...metricOperationSharedSchema,
  /**
   * Field to be used for the metric
   */
  field: schema.string({ meta: { description: 'Field to be used for the metric' } }),
};

const emptyAsNullSchemaRawObject = {
  /**
   * Whether to consider null values as null
   */
  empty_as_null: schema.boolean({
    meta: {
      description: 'Whether to consider null values as null',
    },
    defaultValue: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  }),
};

export const countMetricOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  ...emptyAsNullSchemaRawObject,
  /**
   * Select the operation type
   */
  operation: schema.literal('count'),
  /**
   * Field to be used for the metric
   */
  field: schema.maybe(schema.string()),
});

export const uniqueCountMetricOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  ...emptyAsNullSchemaRawObject,
  operation: schema.literal('unique_count'),
});

export const metricOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.oneOf([
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('average'),
    schema.literal('median'),
    schema.literal('standard_deviation'),
  ]),
});

export const sumMetricOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  ...emptyAsNullSchemaRawObject,
  operation: schema.literal('sum'),
});

export const lastValueOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.literal('last_value'),
  sort_by: schema.string(),
  show_array_values: schema.boolean({
    meta: { description: 'Handle array values' },
    defaultValue: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
  }),
});

export const percentileOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.literal('percentile'),
  percentile: schema.number({
    meta: { description: 'Percentile' },
    defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
  }),
});

export const percentileRanksOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.literal('percentile_rank'),
  rank: schema.number({
    meta: { description: 'Percentile Rank' },
    defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  }),
});

export const fieldMetricOperationsSchema = schema.oneOf([
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  sumMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export const differencesOperationSchema = schema.object({
  ...metricOperationSharedSchema,
  operation: schema.literal('differences'),
  of: fieldMetricOperationsSchema,
});

export const movingAverageOperationSchema = schema.object({
  ...metricOperationSharedSchema,
  operation: schema.literal('moving_average'),
  of: fieldMetricOperationsSchema,
  window: schema.number({
    meta: { description: 'Window' },
    defaultValue: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
  }),
});

export const cumulativeSumOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.literal('cumulative_sum'),
});

export const counterRateOperationSchema = schema.object({
  ...fieldBasedOperationSharedSchema,
  operation: schema.literal('counter_rate'),
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

export type LensApiAllMetricOperations = typeof metricOperationDefinitionSchema.type;
export type LensApiReferableMetricOperations =
  | LensApiCountMetricOperation
  | LensApiUniqueCountMetricOperation
  | LensApiMetricOperation
  | LensApiSumMetricOperation
  | LensApiLastValueOperation
  | LensApiPercentileOperation
  | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = typeof fieldMetricOperationsSchema.type;

export type LensApiCountMetricOperation = typeof countMetricOperationSchema.type;
export type LensApiUniqueCountMetricOperation = typeof uniqueCountMetricOperationSchema.type;
export type LensApiMetricOperation = typeof metricOperationSchema.type;
export type LensApiSumMetricOperation = typeof sumMetricOperationSchema.type;
export type LensApiLastValueOperation = typeof lastValueOperationSchema.type;
export type LensApiPercentileOperation = typeof percentileOperationSchema.type;
export type LensApiPercentileRanksOperation = typeof percentileRanksOperationSchema.type;
export type LensApiDifferencesOperation = typeof differencesOperationSchema.type;
export type LensApiMovingAverageOperation = typeof movingAverageOperationSchema.type;
export type LensApiCumulativeSumOperation = typeof cumulativeSumOperationSchema.type;
export type LensApiCounterRateOperation = typeof counterRateOperationSchema.type;
export type LensApiFormulaOperation = typeof formulaOperationDefinitionSchema.type;
export type LensApiStaticValueOperation = typeof staticOperationDefinitionSchema.type;

export type LensApiFieldMetricOrFormulaOperation =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation;

export type LensApiAllMetricOrFormulaOperations =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation
  | LensApiDifferencesOperation
  | LensApiMovingAverageOperation
  | LensApiCumulativeSumOperation
  | LensApiCounterRateOperation;
