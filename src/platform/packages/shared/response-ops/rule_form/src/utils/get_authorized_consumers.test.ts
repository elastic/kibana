/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers, DEPRECATED_ALERTING_CONSUMERS } from '@kbn/rule-data-utils';
import { getAuthorizedConsumers } from './get_authorized_consumers';
import type { RuleTypeWithDescription } from '../common/types';
import type { RuleCreationValidConsumer } from '@kbn/rule-data-utils';

describe('getAuthorizedConsumers', () => {
  // @ts-ignore
  const mockValidConsumers = ['consumer1', 'consumer2'] as RuleCreationValidConsumer[];

  it('should return authorized consumers that have "all" privileges and are valid', () => {
    const mockRuleType: RuleTypeWithDescription = {
      authorizedConsumers: {
        consumer1: { all: true },
        consumer2: { all: false },
        consumer3: { all: true },
      },
    } as unknown as RuleTypeWithDescription;

    const result = getAuthorizedConsumers({
      ruleType: mockRuleType,
      validConsumers: mockValidConsumers,
    });

    expect(result).toEqual(['consumer1']);
  });

  it('should filter out deprecated consumers', () => {
    const mockRuleType: RuleTypeWithDescription = {
      authorizedConsumers: {
        [AlertConsumers.OBSERVABILITY]: { all: true },
        consumer1: { all: true },
      },
    } as unknown as RuleTypeWithDescription;

    const result = getAuthorizedConsumers({
      ruleType: mockRuleType,
      validConsumers: [...mockValidConsumers, ...DEPRECATED_ALERTING_CONSUMERS],
    });

    expect(result).toEqual(['consumer1']);
  });

  it('should return an empty array if no consumers have "all" privileges', () => {
    const mockRuleType: RuleTypeWithDescription = {
      authorizedConsumers: {
        consumer1: { all: false },
        consumer2: { all: false },
      },
    } as unknown as RuleTypeWithDescription;

    const result = getAuthorizedConsumers({
      ruleType: mockRuleType,
      validConsumers: mockValidConsumers,
    });

    expect(result).toEqual([]);
  });

  it('should return an empty array if no valid consumers are authorized', () => {
    const mockRuleType: RuleTypeWithDescription = {
      authorizedConsumers: {
        consumer3: { all: true },
      },
    } as unknown as RuleTypeWithDescription;

    const result = getAuthorizedConsumers({
      ruleType: mockRuleType,
      validConsumers: mockValidConsumers,
    });

    expect(result).toEqual([]);
  });
});
