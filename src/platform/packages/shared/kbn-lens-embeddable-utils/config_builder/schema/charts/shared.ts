/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema, type Props } from '@kbn/config-schema';

import {
  countMetricOperationSchema,
  uniqueCountMetricOperationSchema,
  metricOperationSchema,
  sumMetricOperationSchema,
  lastValueOperationSchema,
  percentileOperationSchema,
  percentileRanksOperationSchema,
  differencesOperationSchema,
  movingAverageOperationSchema,
  cumulativeSumOperationSchema,
  counterRateOperationSchema,
  staticOperationDefinitionSchema,
  formulaOperationDefinitionSchema,
  METRIC_OP_TITLES,
} from '../metric_ops';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
  BUCKET_OP_TITLES,
} from '../bucket_ops';

export const baseLegendVisibilitySchema = schema.maybe(
  schema.oneOf([schema.literal('visible'), schema.literal('hidden')], {
    meta: { description: 'Legend visibility.' },
  })
);

export const legendVisibilitySchemaWithAuto = schema.maybe(
  schema.oneOf([schema.literal('auto'), schema.literal('visible'), schema.literal('hidden')], {
    meta: { description: 'Legend visibility.' },
  })
);

export const legendSizeSchema = schema.maybe(
  schema.oneOf(
    [
      schema.literal('auto'),
      schema.literal('s'),
      schema.literal('m'),
      schema.literal('l'),
      schema.literal('xl'),
    ],
    {
      meta: {
        id: 'legendSize',
        title: 'Legend Size',
        description: 'Legend size.',
      },
    }
  )
);

function ctxMeta(context: string, suffix: string, title: string) {
  return { meta: { id: `${context}${suffix}`, title } };
}

function mergeWithSimpleMetrics<T extends Props>(baseSchema: T, context: string) {
  return schema.oneOf([
    countMetricOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'CountMetric', METRIC_OP_TITLES.count)
    ),
    uniqueCountMetricOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'UniqueCountMetric', METRIC_OP_TITLES.uniqueCount)
    ),
    metricOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'StatsMetric', METRIC_OP_TITLES.stats)
    ),
    sumMetricOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'SumMetric', METRIC_OP_TITLES.sum)
    ),
    lastValueOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'LastValue', METRIC_OP_TITLES.lastValue)
    ),
    percentileOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Percentile', METRIC_OP_TITLES.percentile)
    ),
    percentileRanksOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'PercentileRanks', METRIC_OP_TITLES.percentileRanks)
    ),
  ]);
}

function mergeWithRefrenceBasedMetrics<T extends Props>(baseSchema: T, context: string) {
  return schema.oneOf([
    differencesOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Differences', METRIC_OP_TITLES.differences)
    ),
    movingAverageOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'MovingAverage', METRIC_OP_TITLES.movingAverage)
    ),
    cumulativeSumOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'CumulativeSum', METRIC_OP_TITLES.cumulativeSum)
    ),
    counterRateOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'CounterRate', METRIC_OP_TITLES.counterRate)
    ),
  ]);
}

/**
 * Best to not use dynamic schema building logic
 * so the possible combinations are declared here explicitly:
 * - metric without ref based ops (eh. gauge/any chart that cannot have a date histogram)
 * - the previous + ref based ops (eh. line chart with date histogram)
 * - the previous + static op (i.e. reference line or gauge min/max/etc...)
 * - bucket operations
 */

export function mergeAllMetricsWithChartDimensionSchema<T extends Props>(
  baseSchema: T,
  context: string
) {
  return schema.oneOf([
    mergeWithSimpleMetrics(baseSchema, context),
    formulaOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)
    ),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps<T extends Props>(
  baseSchema: T,
  context: string
) {
  return schema.oneOf([
    mergeWithSimpleMetrics(baseSchema, context),
    mergeWithRefrenceBasedMetrics(baseSchema, context),
    formulaOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)
    ),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps<T extends Props>(
  baseSchema: T,
  context: string
) {
  return schema.oneOf([
    mergeWithSimpleMetrics(baseSchema, context),
    mergeWithRefrenceBasedMetrics(baseSchema, context),
    staticOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Static', METRIC_OP_TITLES.static)
    ),
    formulaOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)
    ),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithStaticOps<T extends Props>(
  baseSchema: T,
  context: string
) {
  return schema.oneOf([
    mergeWithSimpleMetrics(baseSchema, context),
    staticOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Static', METRIC_OP_TITLES.static)
    ),
    formulaOperationDefinitionSchema.extends(
      baseSchema,
      ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)
    ),
  ]);
}

export function mergeAllBucketsWithChartDimensionSchema<T extends Props>(
  baseSchema: T,
  context: string
) {
  return schema.oneOf([
    bucketDateHistogramOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'DateHistogram', BUCKET_OP_TITLES.dateHistogram)
    ),
    bucketTermsOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Terms', BUCKET_OP_TITLES.terms)
    ),
    bucketHistogramOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Histogram', BUCKET_OP_TITLES.histogram)
    ),
    bucketRangesOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Ranges', BUCKET_OP_TITLES.ranges)
    ),
    bucketFiltersOperationSchema.extends(
      baseSchema,
      ctxMeta(context, 'Filters', BUCKET_OP_TITLES.filters)
    ),
  ]);
}

/**
 * X-axis scale type for data transformation
 */
export const xScaleSchema = schema.oneOf(
  [schema.literal('ordinal'), schema.literal('temporal'), schema.literal('linear')],
  {
    meta: {
      // IMPORTANT: This description guides LLM agents - modify with caution and test agent behavior after changes
      description:
        "X-axis scale type. Use 'temporal' for timestamp/date fields (for example, @timestamp or DATE_TRUNC results). Use 'ordinal' for categorical/text fields. Use 'linear' for numeric fields.",
    },
  }
);
export type XScaleSchemaType = TypeOf<typeof xScaleSchema>;
