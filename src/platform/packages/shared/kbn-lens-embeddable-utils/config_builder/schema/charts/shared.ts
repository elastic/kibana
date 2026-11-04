/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

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

export const baseLegendVisibilitySchema = lazySchema(() =>
  z
    .union([z.literal('visible'), z.literal('hidden')])
    .optional()
    .meta({ description: 'Legend visibility.' })
);

export const legendVisibilitySchemaWithAuto = lazySchema(() =>
  z
    .union([z.literal('auto'), z.literal('visible'), z.literal('hidden')])
    .optional()
    .meta({ description: 'Legend visibility.' })
);

export const legendSizeSchema = lazySchema(() =>
  z
    .union([z.literal('auto'), z.literal('s'), z.literal('m'), z.literal('l'), z.literal('xl')])
    .optional()
    .meta({
      id: 'visLegendSize',
      title: 'Legend Size',
      description: 'Legend size.',
    })
);

function ctxMeta(context: string, suffix: string, title: string) {
  return { id: `vis${context[0].toUpperCase()}${context.slice(1)}${suffix}`, title };
}

const ctxSchemaCache = new Map<string, { base: z.ZodType; schema: z.ZodType }>();

/**
 * Applies context-specific meta, creating each id'd schema only once so that
 * lazySchema factory re-runs (e.g. after GC) never produce duplicate schema ids.
 */
export function withCtxMeta<T extends z.ZodType>(
  schema: T,
  context: string,
  suffix: string,
  title: string
): T {
  const meta = ctxMeta(context, suffix, title);
  const cached = ctxSchemaCache.get(meta.id);
  if (cached) {
    if (cached.base !== schema) {
      throw new Error(`Schema id "${meta.id}" is already used by a different base schema`);
    }
    return cached.schema as T;
  }
  const created = schema.meta(meta);
  ctxSchemaCache.set(meta.id, { base: schema, schema: created });
  return created;
}

function getSimpleMetricsSchema(context: string) {
  return z.union([
    withCtxMeta(countMetricOperationSchema, context, 'CountMetric', METRIC_OP_TITLES.count),
    withCtxMeta(
      uniqueCountMetricOperationSchema,
      context,
      'UniqueCountMetric',
      METRIC_OP_TITLES.uniqueCount
    ),
    withCtxMeta(metricOperationSchema, context, 'StatsMetric', METRIC_OP_TITLES.stats),
    withCtxMeta(sumMetricOperationSchema, context, 'SumMetric', METRIC_OP_TITLES.sum),
    withCtxMeta(lastValueOperationSchema, context, 'LastValue', METRIC_OP_TITLES.lastValue),
    withCtxMeta(percentileOperationSchema, context, 'Percentile', METRIC_OP_TITLES.percentile),
    withCtxMeta(
      percentileRanksOperationSchema,
      context,
      'PercentileRanks',
      METRIC_OP_TITLES.percentileRanks
    ),
  ]);
}

function getReferenceBasedMetricsSchema(context: string) {
  return z.union([
    withCtxMeta(differencesOperationSchema, context, 'Differences', METRIC_OP_TITLES.differences),
    withCtxMeta(
      movingAverageOperationSchema,
      context,
      'MovingAverage',
      METRIC_OP_TITLES.movingAverage
    ),
    withCtxMeta(
      cumulativeSumOperationSchema,
      context,
      'CumulativeSum',
      METRIC_OP_TITLES.cumulativeSum
    ),
    withCtxMeta(counterRateOperationSchema, context, 'CounterRate', METRIC_OP_TITLES.counterRate),
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
    withCtxMeta(formulaOperationDefinitionSchema, context, 'Formula', METRIC_OP_TITLES.formula),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithRefBasedOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    getReferenceBasedMetricsSchema(context),
    withCtxMeta(formulaOperationDefinitionSchema, context, 'Formula', METRIC_OP_TITLES.formula),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    getReferenceBasedMetricsSchema(context),
    withCtxMeta(staticOperationDefinitionSchema, context, 'Static', METRIC_OP_TITLES.static),
    withCtxMeta(formulaOperationDefinitionSchema, context, 'Formula', METRIC_OP_TITLES.formula),
  ]);
}

export function getMetricsWithChartDimensionSchemaWithStaticOps(context: string) {
  return z.union([
    getSimpleMetricsSchema(context),
    withCtxMeta(staticOperationDefinitionSchema, context, 'Static', METRIC_OP_TITLES.static),
    withCtxMeta(formulaOperationDefinitionSchema, context, 'Formula', METRIC_OP_TITLES.formula),
  ]);
}

export function getBucketsWithChartDimensionSchema(context: string) {
  return z.union([
    withCtxMeta(
      bucketDateHistogramOperationSchema,
      context,
      'DateHistogram',
      BUCKET_OP_TITLES.dateHistogram
    ),
    withCtxMeta(bucketTermsOperationSchema, context, 'Terms', BUCKET_OP_TITLES.terms),
    withCtxMeta(bucketHistogramOperationSchema, context, 'Histogram', BUCKET_OP_TITLES.histogram),
    withCtxMeta(bucketRangesOperationSchema, context, 'Ranges', BUCKET_OP_TITLES.ranges),
    withCtxMeta(bucketFiltersOperationSchema, context, 'Filters', BUCKET_OP_TITLES.filters),
  ]);
}

/**
 * X-axis scale type for data transformation
 */
export const xScaleSchema = lazySchema(() =>
  z.union([z.literal('ordinal'), z.literal('temporal'), z.literal('linear')]).meta({
    // IMPORTANT: This description guides LLM agents - modify with caution and test agent behavior after changes
    description:
      "X-axis scale type. Use 'temporal' for timestamp/date fields (for example, @timestamp or DATE_TRUNC results). Use 'ordinal' for categorical/text fields. Use 'linear' for numeric fields.",
  })
);
export type XScaleSchemaType = z.output<typeof xScaleSchema>;
