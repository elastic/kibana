/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
} from '../metric_ops';
import {
  bucketDateHistogramOperationSchema,
  bucketTermsOperationSchema,
  bucketHistogramOperationSchema,
  bucketRangesOperationSchema,
  bucketFiltersOperationSchema,
} from '../bucket_ops';

export const legendSizeSchema = schema.maybe(
  schema.oneOf(
    [
      schema.literal('auto'),
      schema.literal('small'),
      schema.literal('medium'),
      schema.literal('large'),
      schema.literal('xlarge'),
    ],
    {
      meta: { id: 'legendSize', description: 'Legend size: auto, small, medium, large, or xlarge' },
    }
  )
);

function mergeWithSimpleMetrics<T extends Props>(baseSchema: T) {
  return schema.oneOf([
    countMetricOperationSchema.extends(baseSchema),
    uniqueCountMetricOperationSchema.extends(baseSchema),
    metricOperationSchema.extends(baseSchema),
    sumMetricOperationSchema.extends(baseSchema),
    lastValueOperationSchema.extends(baseSchema),
    percentileOperationSchema.extends(baseSchema),
    percentileRanksOperationSchema.extends(baseSchema),
  ]);
}

function mergeWithRefrenceBasedMetrics<T extends Props>(baseSchema: T) {
  return schema.oneOf([
    differencesOperationSchema.extends(baseSchema),
    movingAverageOperationSchema.extends(baseSchema),
    cumulativeSumOperationSchema.extends(baseSchema),
    counterRateOperationSchema.extends(baseSchema),
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

export function mergeAllMetricsWithChartDimensionSchema<T extends Props>(baseSchema: T) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    mergeWithSimpleMetrics(baseSchema),
    formulaOperationDefinitionSchema.extends(baseSchema),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps<T extends Props>(
  baseSchema: T
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    mergeWithSimpleMetrics(baseSchema),
    mergeWithRefrenceBasedMetrics(baseSchema),
    formulaOperationDefinitionSchema.extends(baseSchema),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps<T extends Props>(
  baseSchema: T
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    mergeWithSimpleMetrics(baseSchema),
    mergeWithRefrenceBasedMetrics(baseSchema),
    staticOperationDefinitionSchema.extends(baseSchema),
    formulaOperationDefinitionSchema.extends(baseSchema),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithStaticOps<T extends Props>(
  baseSchema: T
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    mergeWithSimpleMetrics(baseSchema),
    staticOperationDefinitionSchema.extends(baseSchema),
    formulaOperationDefinitionSchema.extends(baseSchema),
  ]);
}

export function mergeAllBucketsWithChartDimensionSchema<T extends Props>(baseSchema: T) {
  return schema.oneOf([
    bucketDateHistogramOperationSchema.extends(baseSchema),
    bucketTermsOperationSchema.extends(baseSchema),
    bucketHistogramOperationSchema.extends(baseSchema),
    bucketRangesOperationSchema.extends(baseSchema),
    bucketFiltersOperationSchema.extends(baseSchema),
  ]);
}
