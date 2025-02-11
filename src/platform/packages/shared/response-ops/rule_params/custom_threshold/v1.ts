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
import { dataViewSpecSchema } from '../common';
import { oneOfLiterals, validateKQLStringFilter, LEGACY_COMPARATORS } from '../common/utils';

const allowedAggregators = [
  'avg',
  'sum',
  'min',
  'max',
  'cardinality',
  'rate',
  'p95',
  'p99',
  'last_value',
];

const comparators = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });

const searchConfigSchema = schema.object({
  index: schema.oneOf([schema.string(), dataViewSpecSchema]),
  query: schema.object({
    language: schema.string(),
    query: schema.string({
      validate: validateKQLStringFilter,
    }),
  }),
  filter: schema.maybe(
    schema.arrayOf(
      schema.object({
        query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        meta: schema.recordOf(schema.string(), schema.any()),
      })
    )
  ),
});

const customCriterion = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(comparators),
  timeUnit: schema.string(),
  timeSize: schema.number(),
  aggType: schema.maybe(schema.literal('custom')),
  metric: schema.never(),
  metrics: schema.arrayOf(
    schema.oneOf([
      schema.object({
        name: schema.string(),
        aggType: oneOfLiterals(allowedAggregators),
        field: schema.string(),
        filter: schema.never(),
      }),
      schema.object({
        name: schema.string(),
        aggType: schema.literal('count'),
        filter: schema.maybe(
          schema.string({
            validate: validateKQLStringFilter,
          })
        ),
        field: schema.never(),
      }),
    ])
  ),
  equation: schema.maybe(schema.string()),
  label: schema.maybe(schema.string()),
});

export const customThresholdParamsSchema = schema.object(
  {
    criteria: schema.arrayOf(customCriterion),
    groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
    alertOnNoData: schema.maybe(schema.boolean()),
    alertOnGroupDisappear: schema.maybe(schema.boolean()),
    searchConfiguration: searchConfigSchema,
  },
  { unknowns: 'allow' }
);
