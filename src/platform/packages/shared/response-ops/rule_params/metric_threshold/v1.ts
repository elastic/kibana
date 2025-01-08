/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { COMPARATORS } from '@kbn/alerting-comparators';

import {
  LEGACY_COMPARATORS,
  oneOfLiterals,
  validateIsStringElasticsearchJSONFilter,
} from '../common/utils';

const METRIC_EXPLORER_AGGREGATIONS = [
  'avg',
  'max',
  'min',
  'cardinality',
  'rate',
  'count',
  'sum',
  'p95',
  'p99',
  'custom',
] as const;

const comparator = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });

const baseCriterion = {
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(comparator),
  timeUnit: schema.string(),
  timeSize: schema.number(),
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  warningComparator: schema.maybe(oneOfLiterals(comparator)),
};

const nonCountCriterion = schema.object({
  ...baseCriterion,
  metric: schema.string(),
  aggType: oneOfLiterals(METRIC_EXPLORER_AGGREGATIONS),
  customMetrics: schema.never(),
  equation: schema.never(),
  label: schema.never(),
});

const countCriterion = schema.object({
  ...baseCriterion,
  aggType: schema.literal('count'),
  metric: schema.never(),
  customMetrics: schema.never(),
  equation: schema.never(),
  label: schema.never(),
});

const customCriterion = schema.object({
  ...baseCriterion,
  aggType: schema.literal('custom'),
  metric: schema.never(),
  customMetrics: schema.arrayOf(
    schema.oneOf([
      schema.object({
        name: schema.string(),
        aggType: oneOfLiterals(['avg', 'sum', 'max', 'min', 'cardinality']),
        field: schema.string(),
        filter: schema.never(),
      }),
      schema.object({
        name: schema.string(),
        aggType: schema.literal('count'),
        filter: schema.maybe(schema.string()),
        field: schema.never(),
      }),
    ])
  ),
  equation: schema.maybe(schema.string()),
  label: schema.maybe(schema.string()),
});

export const metricThresholdRuleParamsSchema = schema.object(
  {
    criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion, customCriterion])),
    groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
    filterQuery: schema.maybe(
      schema.string({
        validate: validateIsStringElasticsearchJSONFilter,
      })
    ),
    sourceId: schema.string(),
    alertOnNoData: schema.maybe(schema.boolean()),
    alertOnGroupDisappear: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);
