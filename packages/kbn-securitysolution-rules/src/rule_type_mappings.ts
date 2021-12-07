/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from './rule_type_constants';

/**
 * Maps legacy rule types to RAC rule type IDs.
 */
export const ruleTypeMappings = {
  eql: EQL_RULE_TYPE_ID,
  machine_learning: ML_RULE_TYPE_ID,
  query: QUERY_RULE_TYPE_ID,
  saved_query: SAVED_QUERY_RULE_TYPE_ID,
  threat_match: INDICATOR_RULE_TYPE_ID,
  threshold: THRESHOLD_RULE_TYPE_ID,
};
type RuleTypeMappings = typeof ruleTypeMappings;

export type RuleType = keyof RuleTypeMappings;
export type RuleTypeId = RuleTypeMappings[keyof RuleTypeMappings];
