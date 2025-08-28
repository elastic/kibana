/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { filterSchema } from './filter';
import { formatSchema } from './format';

const genericOperationOptionsSchema = formatSchema.extends({
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
});

export const staticOperationDefinitionSchema = genericOperationOptionsSchema.extends({
  operation: schema.literal('static_value'),
  /**
   * Static value
   */
  value: schema.number({
    meta: {
      description: 'Static value',
    },
  }),
});

export const formulaOperationDefinitionSchema = genericOperationOptionsSchema.extends({
  operation: schema.literal('formula'),
  /**
   * Formula
   */
  formula: schema.string({
    meta: {
      description: 'Formula',
    },
  }),
});

export const metricOperationSharedSchema = genericOperationOptionsSchema.extends({
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
  filter: schema.maybe(filterSchema, false),
});

export const fieldBasedOperationSharedSchema = metricOperationSharedSchema.extends({
  /**
   * Field to be used for the metric
   */
  field: schema.string({ meta: { description: 'Field to be used for the metric' } }),
});

const emptyAsNullSchemaRawObject = {
  /**
   * Whether to consider null values as null
   */
  empty_as_null: schema.maybe(
    schema.boolean({
      defaultValue: true,
      meta: {
        description: 'Whether to consider null values as null',
      },
    }), true
  ),
};

export const countMetricOperationSchema = fieldBasedOperationSharedSchema.extends({
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

export const uniqueCountMetricOperationSchema = fieldBasedOperationSharedSchema.extends({
  ...emptyAsNullSchemaRawObject,
  operation: schema.literal('unique_count'),
});

export const metricOperationSchema = fieldBasedOperationSharedSchema.extends({
  operation: schema.oneOf([
    schema.literal('min'),
    schema.literal('max'),
    schema.literal('sum'),
    schema.literal('avg'),
    schema.literal('median'),
  ]),
});

export const lastValueOperationSchema = fieldBasedOperationSharedSchema.extends({
  operation: schema.literal('last_value'),
});

export const percentileOperationSchema = fieldBasedOperationSharedSchema.extends({
  operation: schema.literal('percentile'),
  percentile: schema.number({ meta: { description: 'Percentile' } }),
});

export const percentileRanksOperationSchema = fieldBasedOperationSharedSchema.extends({
  operation: schema.literal('percentile_ranks'),
  ranks: schema.arrayOf(schema.number({ meta: { description: 'Rank' } })),
});

export const fieldMetricOperationsSchema = schema.oneOf([
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
]);

export const differencesOperationSchema = metricOperationSharedSchema.extends({
  operation: schema.literal('differences'),
  of: fieldMetricOperationsSchema,
});

export const movingAverageOperationSchema = metricOperationSharedSchema.extends({
  operation: schema.literal('moving_average'),
  of: fieldMetricOperationsSchema,
  window: schema.number({ meta: { description: 'Window' } }),
});

export const cumulativeSumOperationSchema = fieldBasedOperationSharedSchema.extends({
  operation: schema.literal('cumulative_sum'),
});

export const counterRateOperationSchema = fieldBasedOperationSharedSchema.extends({
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

export type LensApiMetricOperations = TypeOf<typeof metricOperationDefinitionSchema>;
export type LensApiFieldMetricOperations = TypeOf<typeof fieldMetricOperationsSchema>;

export type LensApiCountMetricOperation = TypeOf<typeof countMetricOperationSchema>;
export type LensApiUniqueCountMetricOperation = TypeOf<typeof uniqueCountMetricOperationSchema>;
export type LensApiMetricOperation = TypeOf<typeof metricOperationSchema>;
export type LensApiLastValueOperation = TypeOf<typeof lastValueOperationSchema>;
export type LensApiPercentileOperation = TypeOf<typeof percentileOperationSchema>;
export type LensApiPercentileRanksOperation = TypeOf<typeof percentileRanksOperationSchema>;
export type LensApiDifferencesOperation = TypeOf<typeof differencesOperationSchema>;
export type LensApiMovingAverageOperation = TypeOf<typeof movingAverageOperationSchema>;
export type LensApiCumulativeSumOperation = TypeOf<typeof cumulativeSumOperationSchema>;
export type LensApiCounterRateOperation = TypeOf<typeof counterRateOperationSchema>;
export type LensApiFormulaOperation = TypeOf<typeof formulaOperationDefinitionSchema>;
export type LensApiStaticValueOperation = TypeOf<typeof staticOperationDefinitionSchema>;
