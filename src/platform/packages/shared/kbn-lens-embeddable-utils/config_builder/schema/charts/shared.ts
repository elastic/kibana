/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

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

export const baseLegendVisibilitySchema = z
  .union([z.literal('visible'), z.literal('hidden')])
  .optional()
  .meta({ description: 'Legend visibility.' });

export const legendVisibilitySchemaWithAuto = z
  .union([z.literal('auto'), z.literal('visible'), z.literal('hidden')])
  .optional()
  .meta({ description: 'Legend visibility.' });

export const legendSizeSchema = z
  .union([z.literal('auto'), z.literal('s'), z.literal('m'), z.literal('l'), z.literal('xl')])
  .optional()
  .meta({
    id: 'legendSize',
    title: 'Legend Size',
    description: 'Legend size.',
  });

function ctxMeta(context: string, suffix: string, title: string) {
  return { id: `${context}${suffix}`, title };
}

function getSimpleMetricsSchema(context: string) {
  return z.union([
    countMetricOperationSchema.meta(ctxMeta(context, 'CountMetric', METRIC_OP_TITLES.count)),
    uniqueCountMetricOperationSchema.meta(
      ctxMeta(context, 'UniqueCountMetric', METRIC_OP_TITLES.uniqueCount)
    ),
    metricOperationSchema.meta(ctxMeta(context, 'StatsMetric', METRIC_OP_TITLES.stats)),
    sumMetricOperationSchema.meta(ctxMeta(context, 'SumMetric', METRIC_OP_TITLES.sum)),
    lastValueOperationSchema.meta(ctxMeta(context, 'LastValue', METRIC_OP_TITLES.lastValue)),
    percentileOperationSchema.meta(ctxMeta(context, 'Percentile', METRIC_OP_TITLES.percentile)),
    percentileRanksOperationSchema.meta(
      ctxMeta(context, 'PercentileRanks', METRIC_OP_TITLES.percentileRanks)
    ),
  ]);
}

function getReferenceBasedMetricsSchema(context: string) {
  return z.union([
    differencesOperationSchema.meta(ctxMeta(context, 'Differences', METRIC_OP_TITLES.differences)),
    movingAverageOperationSchema.meta(
      ctxMeta(context, 'MovingAverage', METRIC_OP_TITLES.movingAverage)
    ),
    cumulativeSumOperationSchema.meta(
      ctxMeta(context, 'CumulativeSum', METRIC_OP_TITLES.cumulativeSum)
    ),
    counterRateOperationSchema.meta(ctxMeta(context, 'CounterRate', METRIC_OP_TITLES.counterRate)),
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

export function getMetricsWithChartDimensionSchema(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    formulaOperationDefinitionSchema.meta(ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithRefBasedOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    getReferenceBasedMetricsSchema(context),
    formulaOperationDefinitionSchema.meta(ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    getReferenceBasedMetricsSchema(context),
    staticOperationDefinitionSchema.meta(ctxMeta(context, 'Static', METRIC_OP_TITLES.static)),
    formulaOperationDefinitionSchema.meta(ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithStaticOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    staticOperationDefinitionSchema.meta(ctxMeta(context, 'Static', METRIC_OP_TITLES.static)),
    formulaOperationDefinitionSchema.meta(ctxMeta(context, 'Formula', METRIC_OP_TITLES.formula)),
  ]);
}

export function getBucketsWithChartDimensionSchema(context: string) {
  return z.union([
    bucketDateHistogramOperationSchema.meta(
      ctxMeta(context, 'DateHistogram', BUCKET_OP_TITLES.dateHistogram)
    ),
    bucketTermsOperationSchema.meta(ctxMeta(context, 'Terms', BUCKET_OP_TITLES.terms)),
    bucketHistogramOperationSchema.meta(ctxMeta(context, 'Histogram', BUCKET_OP_TITLES.histogram)),
    bucketRangesOperationSchema.meta(ctxMeta(context, 'Ranges', BUCKET_OP_TITLES.ranges)),
    bucketFiltersOperationSchema.meta(ctxMeta(context, 'Filters', BUCKET_OP_TITLES.filters)),
  ]);
}

/**
 * X-axis scale type for data transformation
 */
export const xScaleSchema = z
  .union([z.literal('ordinal'), z.literal('temporal'), z.literal('linear')])
  .meta({
    // IMPORTANT: This description guides LLM agents - modify with caution and test agent behavior after changes
    description:
      "X-axis scale type. Use 'temporal' for timestamp/date fields (for example, @timestamp or DATE_TRUNC results). Use 'ordinal' for categorical/text fields. Use 'linear' for numeric fields.",
  });
export type XScaleSchemaType = z.output<typeof xScaleSchema>;
