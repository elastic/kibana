/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRuleTypeIdsForSolution } from './get_rule_types_by_solution';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import type { RuleTypeSolution } from '@kbn/alerting-types';

const ruleTypes = [
  { id: 'stack-rule-type', solution: 'stack' },
  { id: 'observability-rule-type', solution: 'observability' },
  { id: 'security-rule-type', solution: 'security' },
] as InternalRuleType[];

describe('getRuleTypeIdsForSolution', () => {
  it.each(['stack', 'observability', 'security'] as RuleTypeSolution[])(
    'should return %s rule type ids when `includeStackInObservability` is false',
    (solution) => {
      expect(getRuleTypeIdsForSolution(ruleTypes, solution, false)).toEqual(
        ruleTypes
          .filter((ruleType) => ruleType.solution === solution)
          .map((ruleType) => ruleType.id)
      );
    }
  );

  it('should group stack rule type ids under observability when `includeStackInObservability` is true', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'observability')).toEqual([
      'stack-rule-type',
      'observability-rule-type',
    ]);
  });

  it('should always return security rule type ids in isolation', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security')).toEqual(['security-rule-type']);
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security', false)).toEqual(['security-rule-type']);
  });
});
