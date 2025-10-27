/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, type ObjectType, type Props } from '@kbn/config-schema';
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

/**
 * Best to not use dynamic schema building logic
 * so the possible combinations are declared here explicitly:
 * - metric without ref based ops (eh. gauge/any chart that cannot have a date histogram)
 * - the previous + ref based ops (eh. line chart with date histogram)
 * - the previous + static op (i.e. reference line or gauge min/max/etc...)
 * - bucket operations
 */

export function mergeAllMetricsWithChartDimensionSchema<T extends Props>(
  baseSchema: ObjectType<T>
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([baseSchema, countMetricOperationSchema]),
      schema.allOf([baseSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([baseSchema, metricOperationSchema]),
      schema.allOf([baseSchema, sumMetricOperationSchema]),
      schema.allOf([baseSchema, lastValueOperationSchema]),
      schema.allOf([baseSchema, percentileOperationSchema]),
      schema.allOf([baseSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([schema.allOf([baseSchema, formulaOperationDefinitionSchema])]),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithRefBasedOps<T extends Props>(
  baseSchema: ObjectType<T>
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([baseSchema, countMetricOperationSchema]),
      schema.allOf([baseSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([baseSchema, metricOperationSchema]),
      schema.allOf([baseSchema, sumMetricOperationSchema]),
      schema.allOf([baseSchema, lastValueOperationSchema]),
      schema.allOf([baseSchema, percentileOperationSchema]),
      schema.allOf([baseSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([baseSchema, differencesOperationSchema]),
      schema.allOf([baseSchema, movingAverageOperationSchema]),
      schema.allOf([baseSchema, cumulativeSumOperationSchema]),
      schema.allOf([baseSchema, counterRateOperationSchema]),
    ]),
    schema.oneOf([schema.allOf([baseSchema, formulaOperationDefinitionSchema])]),
  ]);
}

export function mergeAllMetricsWithChartDimensionSchemaWithTimeBasedAndStaticOps<T extends Props>(
  baseSchema: ObjectType<T>
) {
  return schema.oneOf([
    // oneOf allows only 12 items
    // so break down metrics based on the type: field-based, reference-based, formula-like
    schema.oneOf([
      schema.allOf([baseSchema, countMetricOperationSchema]),
      schema.allOf([baseSchema, uniqueCountMetricOperationSchema]),
      schema.allOf([baseSchema, metricOperationSchema]),
      schema.allOf([baseSchema, sumMetricOperationSchema]),
      schema.allOf([baseSchema, lastValueOperationSchema]),
      schema.allOf([baseSchema, percentileOperationSchema]),
      schema.allOf([baseSchema, percentileRanksOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([baseSchema, differencesOperationSchema]),
      schema.allOf([baseSchema, movingAverageOperationSchema]),
      schema.allOf([baseSchema, cumulativeSumOperationSchema]),
      schema.allOf([baseSchema, counterRateOperationSchema]),
    ]),
    schema.oneOf([
      schema.allOf([baseSchema, staticOperationDefinitionSchema]),
      schema.allOf([baseSchema, formulaOperationDefinitionSchema]),
    ]),
  ]);
}

export function mergeAllBucketsWithChartDimensionSchema<T extends Props>(
  baseSchema: ObjectType<T>
) {
  return schema.oneOf([
    schema.allOf([baseSchema, bucketDateHistogramOperationSchema]),
    schema.allOf([baseSchema, bucketTermsOperationSchema]),
    schema.allOf([baseSchema, bucketHistogramOperationSchema]),
    schema.allOf([baseSchema, bucketRangesOperationSchema]),
    schema.allOf([baseSchema, bucketFiltersOperationSchema]),
  ]);
}
