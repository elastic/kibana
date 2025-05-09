/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRuleTypeIdsForSolution, isFilter } from './utils';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import type { RuleTypeSolution } from '@kbn/alerting-types';

const ruleTypes = [
  { id: 'stack-rule-type', solution: 'stack' },
  { id: 'observability-rule-type', solution: 'observability' },
  { id: 'security-rule-type', solution: 'security' },
] as InternalRuleType[];

describe('getRuleTypeIdsForSolution', () => {
  it.each(['stack', 'observability', 'security'] as RuleTypeSolution[])(
    'should include %s rule type ids in the returned array',
    (solution) => {
      const solutionRuleTypeIds = ruleTypes
        .filter((ruleType) => ruleType.solution === solution)
        .map((ruleType) => ruleType.id);
      const ruleTypeIds = getRuleTypeIdsForSolution(ruleTypes, solution);
      for (const ruleTypeId of solutionRuleTypeIds) {
        expect(ruleTypeIds).toContain(ruleTypeId);
      }
    }
  );

  it('should group stack rule type ids under observability', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'observability')).toEqual([
      'stack-rule-type',
      'observability-rule-type',
    ]);
  });

  it('should always return security rule type ids in isolation', () => {
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security')).toEqual(['security-rule-type']);
    expect(getRuleTypeIdsForSolution(ruleTypes, 'security')).toEqual(['security-rule-type']);
  });
});

describe('isFilter', () => {
  it('should return true for items with filter property', () => {
    expect(isFilter({ filter: {} })).toBeTruthy();
  });

  it.each([null, undefined])('should return false for %s items', (filter) => {
    // @ts-expect-error: Testing empty values
    expect(isFilter(filter)).toBeFalsy();
  });
});
