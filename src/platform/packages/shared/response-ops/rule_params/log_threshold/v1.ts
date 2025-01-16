/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';

const persistedLogViewReferenceRT = rt.type({
  logViewId: rt.string,
  type: rt.literal('log-view-reference'),
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

const ComparatorRT = rt.keyof({
  [Comparator.GT]: null,
  [Comparator.GT_OR_EQ]: null,
  [Comparator.LT]: null,
  [Comparator.LT_OR_EQ]: null,
  [Comparator.EQ]: null,
  [Comparator.NOT_EQ]: null,
  [Comparator.MATCH]: null,
  [Comparator.NOT_MATCH]: null,
  [Comparator.MATCH_PHRASE]: null,
  [Comparator.NOT_MATCH_PHRASE]: null,
});

export const ThresholdRT = rt.type({
  comparator: ComparatorRT,
  value: rt.number,
});

export type Threshold = rt.TypeOf<typeof ThresholdRT>;

export const criterionRT = rt.type({
  field: rt.string,
  comparator: ComparatorRT,
  value: rt.union([rt.string, rt.number]),
});

export const countCriteriaRT = rt.array(criterionRT);
export const ratioCriteriaRT = rt.tuple([countCriteriaRT, countCriteriaRT]);

export const timeUnitRT = rt.union([
  rt.literal('s'),
  rt.literal('m'),
  rt.literal('h'),
  rt.literal('d'),
]);
export type TimeUnit = rt.TypeOf<typeof timeUnitRT>;

export const timeSizeRT = rt.number;
export const groupByRT = rt.array(rt.string);

export const RequiredRuleParamsRT = rt.type({
  // NOTE: "count" would be better named as "threshold", but this would require a
  // migration of encrypted saved objects, so we'll keep "count" until it's problematic.
  count: ThresholdRT,
  timeUnit: timeUnitRT,
  timeSize: timeSizeRT,
  logView: persistedLogViewReferenceRT, // Alerts are only compatible with persisted Log Views
});

export const OptionalRuleParamsRT = rt.partial({
  groupBy: groupByRT,
});

export const countRuleParamsRT = rt.intersection([
  rt.type({
    criteria: countCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type CountRuleParams = rt.TypeOf<typeof countRuleParamsRT>;

const ratioRuleParamsRT = rt.intersection([
  rt.type({
    criteria: ratioCriteriaRT,
    ...RequiredRuleParamsRT.props,
  }),
  rt.partial({
    ...OptionalRuleParamsRT.props,
  }),
]);
export type RatioRuleParams = rt.TypeOf<typeof ratioRuleParamsRT>;

export const logThresholdParamsRT = rt.union([countRuleParamsRT, ratioRuleParamsRT]);
export type LogThresholdParams = rt.TypeOf<typeof logThresholdParamsRT>;
