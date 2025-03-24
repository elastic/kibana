/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleTypeSolution } from '@kbn/alerting-types';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';

/**
 * Filters rule types by solution and returns their ids.
 * When `includeStackInObservability` is true, observability
 * and stack rule types are treated as one.
 */
export const getRuleTypeIdsForSolution = (
  ruleTypes: InternalRuleType[],
  solution: RuleTypeSolution,
  includeStackInObservability = true
) => {
  return ruleTypes
    .filter(
      (ruleType) =>
        ruleType.solution === solution ||
        (solution === 'observability' &&
          ruleType.solution === 'stack' &&
          includeStackInObservability)
    )
    .map((ruleType) => ruleType.id);
};
