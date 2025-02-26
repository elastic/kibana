/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RuleTypeWithDescription } from '@kbn/alerts-ui-shared';
import { getInitialMultiConsumer } from './get_initial_multi_consumer';

describe('getInitialMultiConsumer', () => {
  const ruleType = {
    id: '.es-query',
    name: 'Test',
    actionGroups: [
      {
        id: 'testActionGroup',
        name: 'Test Action Group',
      },
      {
        id: 'recovered',
        name: 'Recovered',
      },
    ],
    defaultActionGroupId: 'testActionGroup',
    minimumLicenseRequired: 'basic',
    recoveryActionGroup: {
      id: 'recovered',
      name: 'Recovered',
    },
    producer: 'logs',
    authorizedConsumers: {
      alerting: { read: true, all: true },
      test: { read: true, all: true },
      stackAlerts: { read: true, all: true },
      logs: { read: true, all: true },
    },
    actionVariables: {
      params: [],
      state: [],
    },
    enabledInLicense: true,
    category: 'test',
  } as RuleTypeWithDescription;

  const ruleTypes = [
    {
      id: '.es-query',
      name: 'Test',
      actionGroups: [
        {
          id: 'testActionGroup',
          name: 'Test Action Group',
        },
        {
          id: 'recovered',
          name: 'Recovered',
        },
      ],
      defaultActionGroupId: 'testActionGroup',
      minimumLicenseRequired: 'basic',
      recoveryActionGroup: {
        id: 'recovered',
      },
      producer: 'logs',
      authorizedConsumers: {
        alerting: { read: true, all: true },
        test: { read: true, all: true },
        stackAlerts: { read: true, all: true },
        logs: { read: true, all: true },
      },
      actionVariables: {
        params: [],
        state: [],
      },
      enabledInLicense: true,
    },
    {
      enabledInLicense: true,
      recoveryActionGroup: {
        id: 'recovered',
        name: 'Recovered',
      },
      actionGroups: [],
      defaultActionGroupId: 'threshold met',
      minimumLicenseRequired: 'basic',
      authorizedConsumers: {
        stackAlerts: {
          read: true,
          all: true,
        },
      },
      actionVariables: {
        params: [],
        state: [],
      },
      id: '.index-threshold',
      name: 'Index threshold',
      category: 'management',
      producer: 'stackAlerts',
    },
  ] as RuleTypeWithDescription[];

  test('should return null when rule type id does not match', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['logs', 'observability'],
      ruleType: {
        ...ruleType,
        id: 'test',
      },
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe(null);
  });

  test('should return null when no valid consumers', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: [],
      ruleType,
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe(null);
  });

  test('should return same valid consumer when only one valid consumer', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['alerts'],
      ruleType,
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe('alerts');
  });

  test('should not return observability consumer for non serverless', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['logs', 'infrastructure', 'observability'],
      ruleType,
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe('logs');
  });

  test('should return observability consumer for serverless', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['logs', 'infrastructure', 'observability'],
      ruleType,
      ruleTypes,
      isServerless: true,
    });

    expect(res).toBe('observability');
  });

  test('should return null when there is no authorized consumers', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['alerts', 'infrastructure'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe(null);
  });

  test('should return null when multiConsumerSelection is null', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: null,
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          stackAlerts: { read: true, all: true },
        },
      },
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe(null);
  });

  test('should return valid multi consumer correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'logs',
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {
          stackAlerts: { read: true, all: true },
        },
      },
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe('logs');
  });

  test('should return stackAlerts correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'alerts',
      validConsumers: ['stackAlerts', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes,
      isServerless: false,
    });

    expect(res).toBe('stackAlerts');
  });

  test('should return null valid consumer correctly', () => {
    const res = getInitialMultiConsumer({
      multiConsumerSelection: 'alerts',
      validConsumers: ['infrastructure', 'logs'],
      ruleType: {
        ...ruleType,
        authorizedConsumers: {},
      },
      ruleTypes: [],
      isServerless: false,
    });

    expect(res).toBe(null);
  });
});
