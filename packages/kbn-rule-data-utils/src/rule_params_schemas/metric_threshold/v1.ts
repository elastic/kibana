/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as z from 'zod';
import { 
  validateIsOneOfLiteralsV1,
  validateIsStringElasticsearchJSONFilterV1,
} from '../';

const comparators = {
  GT: '>',
  LT: '<',
  GT_OR_EQ: '>=',
  LT_OR_EQ: '<=',
  BETWEEN: 'between',
  OUTSIDE_RANGE: 'outside',
} as const;

const aggregations = {
  COUNT: 'count',
  AVERAGE: 'avg',
  SUM: 'sum',
  MIN: 'min',
  MAX: 'max',
  CARDINALITY: 'cardinality',
  RATE: 'rate',
  P95: 'p95',
  P99: 'p99',
  CUSTOM: 'custom'
} as const;

const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>{
  return z.string().superRefine(validateIsOneOfLiteralsV1(arrayOfLiterals));
};

const baseCriterion = {
  threshold: z.array(z.number()),
  comparator: oneOfLiterals(Object.values(comparators)),
  timeUnit: z.string(),
  timeSize: z.number(),
  warningThreshold: z.optional(z.array(z.number())),
  warningComparator: z.optional(oneOfLiterals(Object.values(comparators))),
};

const nonCountCriterion = z.object({
  ...baseCriterion,
  metric: z.string(),
  aggType: oneOfLiterals(Object.values(aggregations)),
  customMetrics: z.never(),
  equation: z.never(),
  label: z.never(),
});

const countCriterion = z.object({
  ...baseCriterion,
  aggType: z.literal('count'),
  metric: z.never(),
  customMetrics: z.never(),
  equation: z.never(),
  label: z.never(),
});

const customCriterion = z.object({
  ...baseCriterion,
  aggType: z.literal('custom'),
  metric: z.never(),
  customMetrics: z.array(
    z.union([
      z.object({
        name: z.string(),
        aggType: oneOfLiterals(['avg', 'sum', 'max', 'min', 'cardinality']),
        field: z.string(),
        filter: z.never(),
      }),
      z.object({
        name: z.string(),
        aggType: z.literal('count'),
        filter: z.optional(z.string()),
        field: z.never(),
      }),
    ])
  ),
  equation: z.optional(z.string()),
  label: z.optional(z.string()),
});

export const metricThresholdZodParamsSchema = z.object({
  criteria: z.array(
    z.union([countCriterion, nonCountCriterion, customCriterion])
  ),
  groupBy: z.optional(z.union([z.string(), z.array(z.string())])),
  filterQuery: z.optional(
    z.string().superRefine(validateIsStringElasticsearchJSONFilterV1)
  ),
  sourceId: z.string(),
  alertOnNoData: z.optional(z.boolean()),
  alertOnGroupDisappear: z.optional(z.boolean()),
}).passthrough();
