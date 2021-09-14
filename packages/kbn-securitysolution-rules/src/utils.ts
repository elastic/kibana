/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleType, RuleTypeId, ruleTypeMappings } from './rule_type_mappings';

export const isRuleType = (ruleType: unknown): ruleType is RuleType => {
  return Object.keys(ruleTypeMappings).includes(ruleType as string);
};

export const isRuleTypeId = (ruleTypeId: unknown): ruleTypeId is RuleTypeId => {
  return Object.values(ruleTypeMappings).includes(ruleTypeId as RuleTypeId);
};
