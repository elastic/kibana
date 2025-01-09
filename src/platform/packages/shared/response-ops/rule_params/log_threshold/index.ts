/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  Comparator,
  criterionRT,
  RequiredRuleParamsRT,
  OptionalRuleParamsRT,
  logThresholdParamsRT,
  countCriteriaRT,
  ratioCriteriaRT,
  timeUnitRT,
  timeSizeRT,
  groupByRT,
  ThresholdRT,
} from './latest';
export {
  Comparator as ComparatorV1,
  criterionRT as criterionRTV1,
  RequiredRuleParamsRT as RequiredRuleParamsRTV1,
  OptionalRuleParamsRT as OptionalRuleParamsRTV1,
  logThresholdParamsRT as logThresholdParamsRTV1,
  countCriteriaRT as countCriteriaRTV1,
  ratioCriteriaRT as ratioCriteriaRTV1,
  timeUnitRT as timeUnitRTV1,
  timeSizeRT as timeSizeRTV1,
  groupByRT as groupByRTV1,
  ThresholdRT as ThresholdRTV1,
} from './v1';

export type {
  LogThresholdParams,
  CountRuleParams,
  RatioRuleParams,
  TimeUnit,
  Threshold,
} from './latest';
export type {
  LogThresholdParams as LogThresholdParamsV1,
  CountRuleParams as CountRuleParamsV1,
  RatioRuleParams as RatioRuleParamsV1,
  TimeUnit as TimeUnitV1,
  Threshold as ThresholdV1,
} from './v1';
