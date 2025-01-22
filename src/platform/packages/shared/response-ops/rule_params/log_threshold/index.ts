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
  criterionSchema,
  RequiredRuleParamsSchema,
  OptionalRuleParamsSchema,
  logThresholdParamsSchema,
  countCriteriaSchema,
  ratioCriteriaSchema,
  timeUnitSchema,
  timeSizeSchema,
  groupBySchema,
  ThresholdSchema,
} from './latest';
export {
  Comparator as ComparatorV1,
  criterionSchema as criterionSchemaV1,
  RequiredRuleParamsSchema as RequiredRuleParamsSchemaV1,
  OptionalRuleParamsSchema as OptionalRuleParamsSchemaV1,
  logThresholdParamsSchema as logThresholdParamsSchemaV1,
  countCriteriaSchema as countCriteriaSchemaV1,
  ratioCriteriaSchema as ratioCriteriaSchemaV1,
  timeUnitSchema as timeUnitSchemaV1,
  timeSizeSchema as timeSizeSchemaV1,
  groupBySchema as groupBySchemaV1,
  ThresholdSchema as ThresholdSchemaV1,
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
