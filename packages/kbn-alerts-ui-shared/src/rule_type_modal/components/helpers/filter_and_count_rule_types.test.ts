/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RuleTypeWithDescription } from '../../types';
import { filterAndCountRuleTypes } from './filter_and_count_rule_types';

const mockRuleType: (
  name: string,
  producer: string,
  description: string
) => RuleTypeWithDescription = (name, producer, description) => ({
  id: name,
  name,
  producer,
  description,
  authorizedConsumers: {},
  actionVariables: { params: [] },
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  recoveryActionGroup: { id: 'recovered', name: 'recovered' },
  actionGroups: [],
  defaultActionGroupId: 'default',
});

const pickRuleTypeName = (ruleType: RuleTypeWithDescription) => ({ name: ruleType.name });

describe('filterAndCountRuleTypes', () => {
  const ruleTypeIndex = new Map([
    ['rule1', mockRuleType('rule1', 'producer1', 'first rule type')],
    ['rule2', mockRuleType('rule2', 'producer1', 'second rule type')],
    ['rule3', mockRuleType('rule3', 'producer2', 'third rule type')],
    ['rule4', mockRuleType('rule4', 'producer2', 'fourth rule type')],
    ['rule5', mockRuleType('rule5', 'producer2', 'fifth rule type')],
    ['rule6', mockRuleType('rule6', 'producer1', 'sixth rule type')],
  ]);

  it('should return an empty array and total 0 when ruleTypeIndex is empty', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(new Map(), null, '');
    expect(ruleTypes).toEqual([]);
    expect(ruleTypeCountsByProducer).toEqual({ total: 0 });
  });

  it('should return all rule types when no producer or search string is provided', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(ruleTypeIndex, null, '');
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([
      { name: 'rule1' },
      { name: 'rule2' },
      { name: 'rule3' },
      { name: 'rule4' },
      { name: 'rule5' },
      { name: 'rule6' },
    ]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 3, producer2: 3, total: 6 });
  });

  it('should filter titles by search string', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(ruleTypeIndex, null, '1');
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([{ name: 'rule1' }]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 1, total: 1 });
  });

  it('should filter descriptions by search string', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(
      ruleTypeIndex,
      null,
      'second'
    );
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([{ name: 'rule2' }]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 1, total: 1 });
  });

  it('should filter by producer without applying this filter to the total counts', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(
      ruleTypeIndex,
      'producer1',
      ''
    );
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([
      { name: 'rule1' },
      { name: 'rule2' },
      { name: 'rule6' },
    ]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 3, producer2: 3, total: 6 });
  });

  it('should filter by producer and search string', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(
      ruleTypeIndex,
      'producer1',
      'second'
    );
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([{ name: 'rule2' }]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 1, total: 1 });
  });

  it('should filter by search string before calculating counts', () => {
    const [ruleTypes, ruleTypeCountsByProducer] = filterAndCountRuleTypes(
      ruleTypeIndex,
      null,
      'th' // Filter out all but rules with third, fourth, fifth, sixth in description
    );
    expect(ruleTypes.map(pickRuleTypeName)).toEqual([
      { name: 'rule3' },
      { name: 'rule4' },
      { name: 'rule5' },
      { name: 'rule6' },
    ]);
    expect(ruleTypeCountsByProducer).toEqual({ producer1: 1, producer2: 3, total: 4 });
  });
});
