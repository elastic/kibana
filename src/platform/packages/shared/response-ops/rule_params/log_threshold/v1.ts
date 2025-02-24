/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

const persistedLogViewReferenceSchema = schema.object({
  logViewId: schema.string(),
  type: schema.literal('log-view-reference'),
});

// Comparators //
enum Comparator {
  GT = 'more than',
  GT_OR_EQ = 'more than or equals',
  LT = 'less than',
  LT_OR_EQ = 'less than or equals',
  EQ = 'equals',
  NOT_EQ = 'does not equal',
  MATCH = 'matches',
  NOT_MATCH = 'does not match',
  MATCH_PHRASE = 'matches phrase',
  NOT_MATCH_PHRASE = 'does not match phrase',
}

const ComparatorSchema = schema.oneOf([
  schema.literal(Comparator.GT),
  schema.literal(Comparator.GT_OR_EQ),
  schema.literal(Comparator.LT),
  schema.literal(Comparator.LT_OR_EQ),
  schema.literal(Comparator.EQ),
  schema.literal(Comparator.NOT_EQ),
  schema.literal(Comparator.MATCH),
  schema.literal(Comparator.NOT_MATCH),
  schema.literal(Comparator.MATCH_PHRASE),
  schema.literal(Comparator.NOT_MATCH_PHRASE),
]);

const ThresholdSchema = schema.object({
  comparator: ComparatorSchema,
  value: schema.number(),
});

const criterionSchema = schema.object({
  field: schema.string(),
  comparator: ComparatorSchema,
  value: schema.oneOf([schema.string(), schema.number()]),
});

const countCriteriaSchema = schema.arrayOf(criterionSchema);
const ratioCriteriaSchema = schema.arrayOf(countCriteriaSchema);

const timeUnitSchema = schema.oneOf([
  schema.literal('s'),
  schema.literal('m'),
  schema.literal('h'),
  schema.literal('d'),
]);

const timeSizeSchema = schema.number();
const groupBySchema = schema.arrayOf(schema.string());

const RequiredRuleParamsSchema = schema.object({
  // NOTE: "count" would be better named as "threshold", but this would require a
  // migration of encrypted saved objects, so we'll keep "count" until it's problematic.
  count: ThresholdSchema,
  timeUnit: timeUnitSchema,
  timeSize: timeSizeSchema,
  logView: persistedLogViewReferenceSchema, // Alerts are only compatible with persisted Log Views
});

const OptionalRuleParamsSchema = schema.object({
  groupBy: schema.maybe(groupBySchema),
});

const countRuleParamsSchema = schema.intersection([
  schema.object({
    criteria: countCriteriaSchema,
  }),
  RequiredRuleParamsSchema,
  OptionalRuleParamsSchema,
]);

const ratioRuleParamsSchema = schema.intersection([
  schema.object({
    criteria: ratioCriteriaSchema,
  }),
  RequiredRuleParamsSchema,
  OptionalRuleParamsSchema,
]);

export const logThresholdParamsSchema = schema.oneOf([
  countRuleParamsSchema,
  ratioRuleParamsSchema,
]);

// Export types for TypeScript
export type LogThresholdParams = ReturnType<typeof logThresholdParamsSchema.validate>;
