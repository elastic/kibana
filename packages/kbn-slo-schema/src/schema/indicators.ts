/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as t from 'io-ts';
import { allOrAnyString, dateRangeSchema } from './common';

const apmTransactionDurationIndicatorTypeSchema = t.literal('sli.apm.transactionDuration');
const apmTransactionDurationIndicatorSchema = t.type({
  type: apmTransactionDurationIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transactionType: allOrAnyString,
      transactionName: allOrAnyString,
      threshold: t.number,
      index: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const apmTransactionErrorRateIndicatorTypeSchema = t.literal('sli.apm.transactionErrorRate');
const apmTransactionErrorRateIndicatorSchema = t.type({
  type: apmTransactionErrorRateIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transactionType: allOrAnyString,
      transactionName: allOrAnyString,
      index: t.string,
    }),
    t.partial({
      filter: t.string,
    }),
  ]),
});

const kqlCustomIndicatorTypeSchema = t.literal('sli.kql.custom');
const kqlCustomIndicatorSchema = t.type({
  type: kqlCustomIndicatorTypeSchema,
  params: t.type({
    index: t.string,
    filter: t.string,
    good: t.string,
    total: t.string,
    timestampField: t.string,
  }),
});

const metricCustomValidAggregations = t.keyof({
  sum: true,
});
const metricCustomMetricDef = t.type({
  metrics: t.array(
    t.type({
      name: t.string,
      aggregation: metricCustomValidAggregations,
      field: t.string,
    })
  ),
  equation: t.string,
});
const metricCustomIndicatorTypeSchema = t.literal('sli.metric.custom');
const metricCustomIndicatorSchema = t.type({
  type: metricCustomIndicatorTypeSchema,
  params: t.type({
    index: t.string,
    filter: t.string,
    good: metricCustomMetricDef,
    total: metricCustomMetricDef,
    timestampField: t.string,
  }),
});

const indicatorDataSchema = t.type({
  dateRange: dateRangeSchema,
  good: t.number,
  total: t.number,
});

const indicatorTypesSchema = t.union([
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorTypeSchema,
  metricCustomIndicatorTypeSchema,
]);

// Validate that a string is a comma separated list of indicator types,
// e.g. sli.kql.custom,sli.apm.transactionDuration
// Transform to an array of indicator type
const indicatorTypesArraySchema = new t.Type<string[], string, unknown>(
  'indicatorTypesArray',
  (input: unknown): input is string[] =>
    Array.isArray(input) && input.every((i) => typeof i === 'string'),
  (input: unknown, context: t.Context) => {
    if (typeof input === 'string') {
      const values = input.split(',');
      if (values.every((value) => typeof value === 'string' && indicatorTypesSchema.is(value))) {
        return t.success(values);
      }
    }
    return t.failure(input, context);
  },
  (values: string[]): string => values.join(',')
);

const indicatorSchema = t.union([
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
]);

export {
  apmTransactionDurationIndicatorSchema,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorSchema,
  kqlCustomIndicatorTypeSchema,
  metricCustomIndicatorTypeSchema,
  metricCustomIndicatorSchema,
  indicatorSchema,
  indicatorTypesArraySchema,
  indicatorTypesSchema,
  indicatorDataSchema,
};
