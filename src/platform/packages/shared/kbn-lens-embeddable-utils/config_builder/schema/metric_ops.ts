/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { z } from '@kbn/zod';
import { filterSchema } from './filter';
import { formatSchema } from './format';
import {
  LENS_LAST_VALUE_DEFAULT_MULTI_VALUE,
  LENS_MOVING_AVERAGE_DEFAULT_WINDOW,
  LENS_PERCENTILE_DEFAULT_VALUE,
  LENS_PERCENTILE_RANK_DEFAULT_VALUE,
  LENS_STATIC_VALUE_DEFAULT,
} from './constants';
import { LENS_EMPTY_AS_NULL_DEFAULT_VALUE } from '../transforms/columns/utils';
import { labelSharedSchema } from './shared';

export const genericOperationOptionsSchema = z
  .object({
    ...formatSchema.shape,
    ...labelSharedSchema.shape,
  })
  .strict();

export const METRIC_OP_TITLES = {
  static: 'Static Operation Definition',
  formula: 'Formula Operation',
  count: 'Count Metric Operation',
  uniqueCount: 'Unique Count Metric Operation',
  stats: 'Stats Metric Operation',
  sum: 'Sum Metric Operation',
  lastValue: 'Last Value Operation',
  percentile: 'Percentile Operation',
  percentileRanks: 'Percentile Ranks Operation',
  differences: 'Differences Operation',
  movingAverage: 'Moving Average Operation',
  cumulativeSum: 'Cumulative Sum Operation',
  counterRate: 'Counter Rate Operation',
} as const;

export const staticOperationDefinitionSchema = genericOperationOptionsSchema
  .extend({
    operation: z.literal('static_value'),
    /**
     * Static value
     */
    value: z.number().default(LENS_STATIC_VALUE_DEFAULT).meta({
      description: 'Static value',
    }),
  })
  .meta({ id: 'staticOperationDefinition', title: METRIC_OP_TITLES.static });

const advancedOperationSettings = {
  /**
   * Reduced time range
   */
  reduced_time_range: z.string().optional().meta({
    id: 'operationReducedTimeRangeSetting',
    title: 'Operation Reduced Time Range Setting',
    description: 'Reduced time range',
  }),
  /**
   * Time shift
   */
  time_shift: z.string().optional().meta({
    id: 'operationTimeShiftSetting',
    title: 'Operation Time Shift Setting',
    description: 'Time shift',
  }),
  /**
   * Filter
   */
  filter: filterSchema.optional(),
  /**
   * Time scale
   */
  time_scale: z
    .union([z.literal('s'), z.literal('m'), z.literal('h'), z.literal('d')])
    .optional()
    .meta({
      id: 'operationTimeScaleSetting',
      title: 'Operation Time Scale Setting',
      description: 'Time scale',
    }),
};

export const formulaOperationDefinitionSchema = genericOperationOptionsSchema
  .extend({
    operation: z.literal('formula'),
    /**
     * Formula
     */
    formula: z.string().meta({
      description: 'Formula',
    }),
    ...omit(advancedOperationSettings, ['time_shift']),
    /**
     * Custom scaling for the entire formula
     */
    time_scale: z
      .union([z.literal('s'), z.literal('m'), z.literal('h'), z.literal('d')])
      .optional()
      .meta({ description: 'Time scale' }),
  })
  .meta({ id: 'formulaOperation', title: METRIC_OP_TITLES.formula });

const esqlColumn = {
  column: z.string().meta({
    description: 'Column to use',
  }),
};

export const esqlColumnSchema = z
  .object({
    ...esqlColumn,
    ...labelSharedSchema.shape,
  })
  .strict();

export const esqlColumnWithFormatSchema = esqlColumnSchema.extend(formatSchema.shape);

export const metricOperationSharedSchema =
  genericOperationOptionsSchema.extend(advancedOperationSettings);

export const fieldBasedOperationSharedSchema = metricOperationSharedSchema.extend({
  /**
   * Field to be used for the metric
   */
  field: z.string().meta({ description: 'Field to be used for the metric' }),
});

const emptyAsNullSchemaRawObject = {
  /**
   * Whether to consider null values as null
   */
  empty_as_null: z.boolean().default(LENS_EMPTY_AS_NULL_DEFAULT_VALUE).meta({
    description: 'When `true`, treats empty buckets as null instead of zero.',
  }),
};

export const countMetricOperationSchema = fieldBasedOperationSharedSchema
  .extend(emptyAsNullSchemaRawObject)
  .extend({
    /**
     * Select the operation type
     */
    operation: z.literal('count'),
    field: z.string().optional().meta({ description: 'Field to be used for the metric' }),
  })
  .meta({ id: 'countMetricOperation', title: METRIC_OP_TITLES.count });

export const uniqueCountMetricOperationSchema = fieldBasedOperationSharedSchema
  .extend(emptyAsNullSchemaRawObject)
  .extend({
    operation: z.literal('unique_count'),
  })
  .meta({ id: 'uniqueCountMetricOperation', title: METRIC_OP_TITLES.uniqueCount });

export const metricOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.union([
      z.literal('min'),
      z.literal('max'),
      z.literal('average'),
      z.literal('median'),
      z.literal('standard_deviation'),
    ]),
  })
  .meta({ id: 'minMaxAvgMedianStdDevMetricOperation', title: METRIC_OP_TITLES.stats });

export const sumMetricOperationSchema = fieldBasedOperationSharedSchema
  .extend(emptyAsNullSchemaRawObject)
  .extend({
    operation: z.literal('sum'),
  })
  .meta({ id: 'sumMetricOperation', title: METRIC_OP_TITLES.sum });

export const lastValueOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.literal('last_value'),
    time_field: z.string().meta({ description: 'Time field used to determine document recency' }),
    /**
     * Whether to return all values for multi-value fields.
     * Only affects data table and metric charts; other charts use the last value from the array.
     */
    multi_value: z.boolean().default(LENS_LAST_VALUE_DEFAULT_MULTI_VALUE).meta({
      description:
        'Whether to return all values for multi-value fields. Only affects data table and metric charts; other charts use the last value from the array.',
    }),
  })
  .meta({ id: 'lastValueOperation', title: METRIC_OP_TITLES.lastValue });

export const percentileOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.literal('percentile'),
    percentile: z
      .number()
      .default(LENS_PERCENTILE_DEFAULT_VALUE)
      .meta({ description: 'Percentile' }),
  })
  .meta({ id: 'percentileOperation', title: METRIC_OP_TITLES.percentile });

export const percentileRanksOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.literal('percentile_rank'),
    rank: z
      .number()
      .default(LENS_PERCENTILE_RANK_DEFAULT_VALUE)
      .meta({ description: 'Percentile Rank' }),
  })
  .meta({ id: 'percentileRanksOperation', title: METRIC_OP_TITLES.percentileRanks });

export const fieldMetricOperationsSchema = z
  .union([
    countMetricOperationSchema,
    uniqueCountMetricOperationSchema,
    metricOperationSchema,
    sumMetricOperationSchema,
    lastValueOperationSchema,
    percentileOperationSchema,
    percentileRanksOperationSchema,
  ])
  .meta({ id: 'fieldMetricOperations', title: 'Field Metric Operations' });

export const differencesOperationSchema = metricOperationSharedSchema
  .extend({
    operation: z.literal('differences'),
    of: fieldMetricOperationsSchema,
  })
  .meta({ id: 'differencesOperation', title: METRIC_OP_TITLES.differences });

export const movingAverageOperationSchema = metricOperationSharedSchema
  .extend({
    operation: z.literal('moving_average'),
    of: fieldMetricOperationsSchema,
    window: z.number().default(LENS_MOVING_AVERAGE_DEFAULT_WINDOW).meta({ description: 'Window' }),
  })
  .meta({ id: 'movingAverageOperation', title: METRIC_OP_TITLES.movingAverage });

export const cumulativeSumOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.literal('cumulative_sum'),
  })
  .meta({ id: 'cumulativeSumOperation', title: METRIC_OP_TITLES.cumulativeSum });

export const counterRateOperationSchema = fieldBasedOperationSharedSchema
  .extend({
    operation: z.literal('counter_rate'),
  })
  .meta({ id: 'counterRateOperation', title: METRIC_OP_TITLES.counterRate });

export const metricOperationDefinitionSchema = z
  .union([
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
  ])
  .meta({
    title: 'Metric Operation',
    description:
      'Metric dimension configuration, supporting field-based aggregations (count, sum, average, median, standard deviation, unique count, last value), percentile operations, time-series operations (differences, moving average, cumulative sum, counter rate), and mathematical formulas.',
  });

export type LensApiAllMetricOperations = z.output<typeof metricOperationDefinitionSchema>;
export const fieldMetricOrFormulaOperationDefinitionSchema = z
  .union([fieldMetricOperationsSchema, formulaOperationDefinitionSchema])
  .meta({
    title: 'Field Metric or Formula Operation',
    description: 'Metric dimension using a field-based aggregation or a mathematical formula.',
  });

export const fieldMetricOrStaticOrFormulaOperationDefinitionSchema = z
  .union([
    fieldMetricOperationsSchema,
    staticOperationDefinitionSchema,
    formulaOperationDefinitionSchema,
  ])
  .meta({
    title: 'Field Metric, Static Value, or Formula Operation',
    description:
      'Metric dimension using a field-based aggregation, a static value, or a mathematical formula.',
  });

export type LensApiReferableMetricOperations =
  | LensApiCountMetricOperation
  | LensApiUniqueCountMetricOperation
  | LensApiMetricOperation
  | LensApiSumMetricOperation
  | LensApiLastValueOperation
  | LensApiPercentileOperation
  | LensApiPercentileRanksOperation;
export type LensApiFieldMetricOperations = z.output<typeof fieldMetricOperationsSchema>;

export type LensApiCountMetricOperation = z.output<typeof countMetricOperationSchema>;
export type LensApiUniqueCountMetricOperation = z.output<typeof uniqueCountMetricOperationSchema>;
export type LensApiMetricOperation = z.output<typeof metricOperationSchema>;
export type LensApiSumMetricOperation = z.output<typeof sumMetricOperationSchema>;
export type LensApiLastValueOperation = z.output<typeof lastValueOperationSchema>;
export type LensApiPercentileOperation = z.output<typeof percentileOperationSchema>;
export type LensApiPercentileRanksOperation = z.output<typeof percentileRanksOperationSchema>;
export type LensApiDifferencesOperation = z.output<typeof differencesOperationSchema>;
export type LensApiMovingAverageOperation = z.output<typeof movingAverageOperationSchema>;
export type LensApiCumulativeSumOperation = z.output<typeof cumulativeSumOperationSchema>;
export type LensApiCounterRateOperation = z.output<typeof counterRateOperationSchema>;
export type LensApiFormulaOperation = z.output<typeof formulaOperationDefinitionSchema>;
export type LensApiStaticValueOperation = z.output<typeof staticOperationDefinitionSchema>;

export type LensApiFieldMetricOrFormulaOperation =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation;

export type LensApiFieldMetricOrStaticOrFormulaOperation =
  | LensApiFieldMetricOperations
  | LensApiStaticValueOperation
  | LensApiFormulaOperation;

export type LensApiAllMetricOrFormulaOperations =
  | LensApiFieldMetricOperations
  | LensApiFormulaOperation
  | LensApiDifferencesOperation
  | LensApiMovingAverageOperation
  | LensApiCumulativeSumOperation
  | LensApiCounterRateOperation;

export type LensApiESQLColumn = z.output<typeof esqlColumnSchema>;
export type LensApiESQLColumnWithFormat = z.output<typeof esqlColumnWithFormatSchema>;
