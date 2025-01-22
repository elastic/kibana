/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';

export const persistedLogViewReferenceSchema = schema.object({
  logViewId: schema.string(),
  type: schema.literal('log-view-reference'),
});

// Comparators //
export enum Comparator {
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

export const ComparatorSchema = schema.oneOf([
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

export const ThresholdSchema = schema.object({
  comparator: ComparatorSchema,
  value: schema.number(),
});

export const criterionSchema = schema.object({
  field: schema.string(),
  comparator: ComparatorSchema,
  value: schema.oneOf([schema.string(), schema.number()]),
});

export const countCriteriaSchema = schema.arrayOf(criterionSchema);
export const ratioCriteriaSchema = schema.arrayOf(countCriteriaSchema);

export const timeUnitSchema = schema.oneOf([
  schema.literal('s'),
  schema.literal('m'),
  schema.literal('h'),
  schema.literal('d'),
]);

export const timeSizeSchema = schema.number();
export const groupBySchema = schema.arrayOf(schema.string());

export const RequiredRuleParamsSchema = schema.object({
  // NOTE: "count" would be better named as "threshold", but this would require a
  // migration of encrypted saved objects, so we'll keep "count" until it's problematic.
  count: ThresholdSchema,
  timeUnit: timeUnitSchema,
  timeSize: timeSizeSchema,
  logView: persistedLogViewReferenceSchema, // Alerts are only compatible with persisted Log Views
});

export const OptionalRuleParamsSchema = schema.object({
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
export type TimeUnit = ReturnType<typeof timeUnitSchema.validate>;
export type Threshold = ReturnType<typeof ThresholdSchema.validate>;
export type CountRuleParams = ReturnType<typeof countRuleParamsSchema.validate>;
export type RatioRuleParams = ReturnType<typeof ratioRuleParamsSchema.validate>;
export type LogThresholdParams = ReturnType<typeof logThresholdParamsSchema.validate>;
