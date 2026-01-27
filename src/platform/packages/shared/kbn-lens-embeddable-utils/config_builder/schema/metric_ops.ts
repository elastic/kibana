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
import { omit } from 'lodash';
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
import { labelSharedProp } from './shared';

export const genericOperationOptionsSchema = schema.object({
  ...formatSchema,
  ...labelSharedProp,
});

export const staticOperationDefinitionSchema = genericOperationOptionsSchema.extends(
  {
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
  },
  { meta: { id: 'staticOperationDefinition' } }
);

const advancedOperationSettings = {
  /**
   * Reduced time range
   */
  reduced_time_range: schema.maybe(
    schema.string({
      meta: { id: 'operationReducedTimeRangeSetting', description: 'Reduced time range' },
    })
  ),
  /**
   * Time shift
   */
  time_shift: schema.maybe(
    schema.string({ meta: { id: 'operationTimeShiftSetting', description: 'Time shift' } })
  ),
  /**
   * Filter
   */
  filter: schema.maybe(filterSchema),
  /**
   * Time scale
   */
  time_scale: schema.maybe(
    schema.oneOf(
      [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
      { meta: { id: 'operationTimeScaleSetting', description: 'Time scale' } }
    )
  ),
};

export const formulaOperationDefinitionSchema = genericOperationOptionsSchema.extends(
  {
    operation: schema.literal('formula'),
    /**
     * Formula
     */
    formula: schema.string({
      meta: {
        description: 'Formula',
      },
    }),
    ...omit(advancedOperationSettings, ['time_shift']),
    /**
     * Custom scaling for the entire formula
     */
    time_scale: schema.maybe(
      schema.oneOf(
        [schema.literal('s'), schema.literal('m'), schema.literal('h'), schema.literal('d')],
        { meta: { description: 'Time scale' } }
      )
    ),
  },
  { meta: { id: 'formulaOperation' } }
);

const esqlColumn = {
  /**
   * Value
   */
  operation: schema.literal('value'),
  column: schema.string({
    meta: {
      description: 'Column to use',
    },
  }),
};

export const esqlColumnSchema = schema.object(esqlColumn);

export const esqlColumnOperationWithLabelAndFormatSchema =
  genericOperationOptionsSchema.extends(esqlColumn);

export const metricOperationSharedSchema =
  genericOperationOptionsSchema.extends(advancedOperationSettings);

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
  empty_as_null: schema.boolean({
    meta: {
      description: 'Whether to consider null values as null',
    },
    defaultValue: LENS_EMPTY_AS_NULL_DEFAULT_VALUE,
  }),
};

export const countMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      /**
       * Select the operation type
       */
      operation: schema.literal('count'),
      field: schema.maybe(
        schema.string({ meta: { description: 'Field to be used for the metric' } })
      ),
    },
    { meta: { id: 'countMetricOperation' } }
  );

export const uniqueCountMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      operation: schema.literal('unique_count'),
    },
    { meta: { id: 'uniqueCountMetricOperation' } }
  );

export const metricOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.oneOf([
      schema.literal('min'),
      schema.literal('max'),
      schema.literal('average'),
      schema.literal('median'),
      schema.literal('standard_deviation'),
    ]),
  },
  { meta: { id: 'minMaxAvgMedianStdDevMetricOperation' } }
);

export const sumMetricOperationSchema = fieldBasedOperationSharedSchema
  .extends(emptyAsNullSchemaRawObject)
  .extends(
    {
      operation: schema.literal('sum'),
    },
    { meta: { id: 'sumMetricOperation' } }
  );

export const lastValueOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('last_value'),
    sort_by: schema.string(),
    show_array_values: schema.boolean({
      meta: { description: 'Handle array values' },
      defaultValue: LENS_LAST_VALUE_DEFAULT_SHOW_ARRAY_VALUES,
    }),
  },
  { meta: { id: 'lastValueOperation' } }
);

export const percentileOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('percentile'),
    percentile: schema.number({
      meta: { description: 'Percentile' },
      defaultValue: LENS_PERCENTILE_DEFAULT_VALUE,
    }),
  },
  { meta: { id: 'percentileOperation' } }
);

export const percentileRanksOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('percentile_rank'),
    rank: schema.number({
      meta: { description: 'Percentile Rank' },
      defaultValue: LENS_PERCENTILE_RANK_DEFAULT_VALUE,
    }),
  },
  { meta: { id: 'percentileRanksOperation' } }
);

export const fieldMetricOperationsSchema = schema.oneOf(
  [
    countMetricOperationSchema,
    uniqueCountMetricOperationSchema,
    metricOperationSchema,
    sumMetricOperationSchema,
    lastValueOperationSchema,
    percentileOperationSchema,
    percentileRanksOperationSchema,
  ],
  { meta: { id: 'fieldMetricOperations' } }
);

export const differencesOperationSchema = metricOperationSharedSchema.extends(
  {
    operation: schema.literal('differences'),
    of: fieldMetricOperationsSchema,
  },
  { meta: { id: 'differencesOperation' } }
);

export const movingAverageOperationSchema = metricOperationSharedSchema.extends(
  {
    operation: schema.literal('moving_average'),
    of: fieldMetricOperationsSchema,
    window: schema.number({
      meta: { description: 'Window' },
      defaultValue: LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
    }),
  },
  { meta: { id: 'movingAverageOperation' } }
);

export const cumulativeSumOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('cumulative_sum'),
  },
  { meta: { id: 'cumulativeSumOperation' } }
);

export const counterRateOperationSchema = fieldBasedOperationSharedSchema.extends(
  {
    operation: schema.literal('counter_rate'),
  },
  { meta: { id: 'counterRateOperation' } }
);

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

export type LensApiAllMetricOperations = TypeOf<typeof metricOperationDefinitionSchema>;
export const fieldMetricOrFormulaOperationDefinitionSchema = schema.oneOf([
  fieldMetricOperationsSchema,
  formulaOperationDefinitionSchema,
]);

export type LensApiReferableMetricOperations =
  | LensApiCountMetricOperation
  | LensApiUniqueCountMetricOperation
  | LensApiMetricOperation
  | LensApiSumMetricOperation
  | LensApiLastValueOperation
  | LensApiPercentileOperation
  | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = TypeOf<typeof fieldMetricOperationsSchema>;

export type LensApiCountMetricOperation = TypeOf<typeof countMetricOperationSchema>;
export type LensApiUniqueCountMetricOperation = TypeOf<typeof uniqueCountMetricOperationSchema>;
export type LensApiMetricOperation = TypeOf<typeof metricOperationSchema>;
export type LensApiSumMetricOperation = TypeOf<typeof sumMetricOperationSchema>;
export type LensApiLastValueOperation = TypeOf<typeof lastValueOperationSchema>;
export type LensApiPercentileOperation = TypeOf<typeof percentileOperationSchema>;
export type LensApiPercentileRanksOperation = TypeOf<typeof percentileRanksOperationSchema>;
export type LensApiDifferencesOperation = TypeOf<typeof differencesOperationSchema>;
export type LensApiMovingAverageOperation = TypeOf<typeof movingAverageOperationSchema>;
export type LensApiCumulativeSumOperation = TypeOf<typeof cumulativeSumOperationSchema>;
export type LensApiCounterRateOperation = TypeOf<typeof counterRateOperationSchema>;
export type LensApiFormulaOperation = TypeOf<typeof formulaOperationDefinitionSchema>;
export type LensApiStaticValueOperation = TypeOf<typeof staticOperationDefinitionSchema>;

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
