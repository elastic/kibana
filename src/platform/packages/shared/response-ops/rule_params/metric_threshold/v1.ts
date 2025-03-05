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
  /**
   * The threshold value that is used with the `comparator`.
   * If the `comparator` is `between`, you must specify the boundary values.
   */
  threshold: schema.arrayOf(schema.number()),
  /**
   * The comparison function for the threshold.
   * For example, "is above", "is above or equals", "is below", "is below or equals", "is between", and "outside".
   */
  comparator: oneOfLiterals(comparator),
  /**
   * The type of units for the time window: seconds, minutes, hours, or days.
   */
  timeUnit: schema.string(),
  /**
   * The size of the time window (in `timeUnit` units), which determines how far back to search for documents.
   * Generally it should be a value higher than the rule check interval to avoid gaps in detection.
   */
  timeSize: schema.number(),
  /**
   * The threshold value that is used with the `warningComparator`.
   * If the `warningComparator` is `between`, you must specify the boundary values.
   */
  warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
  /**
   * The comparison function for the warning threshold.
   * For example, "is above", "is above or equals", "is below", "is below or equals", "is between", and "outside".
   */
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
        /**
         * An aggregation to gather data for the rule.
         * For example, find the average, highest or lowest value of a numeric field.
         * Or use a cardinality aggregation to find the approximate number of unique values in a field. 
         */
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
    /**
     * Create an alert for every unique value of the specified fields.
     * For example, you can create a rule per host or every mount point of each host.
     *
     * IMPORTANT: If you include the same field in both the `filterQuery` and `groupBy`, you might receive fewer results than you expect.
     * For example, if you filter by `cloud.region: us-east`, grouping by `cloud.region` will have no effect because the filter query can match only one region.
     */
    groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
    /**
     * A query that limits the scope of the rule.
      The rule evaluates only metric data that matches the query.
     */
    filterQuery: schema.maybe(
      schema.string({
        validate: validateIsStringElasticsearchJSONFilter,
      })
    ),
    sourceId: schema.string(),
    /**
     * If true, an alert occurs if the metrics do not report any data over the expected period or if the query fails.
     */
    alertOnNoData: schema.maybe(schema.boolean()),
    /**
     * If true, an alert occurs if a group that previously reported metrics does not report them again over the expected time period.
     * This check is not recommended for dynamically scaling infrastructures that might rapidly start and stop nodes automatically.
     */
    alertOnGroupDisappear: schema.maybe(schema.boolean()),
  },
  { unknowns: 'allow' }
);
