/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertConsumers, ES_QUERY_ID } from '@kbn/rule-data-utils';
import { RuleTypeWithDescription } from '../common/types';
import { hasFieldsForAad } from './has_fields_for_aad';

describe('hasFieldsForAad', () => {
  test('should return true if alert has fields for add', () => {
    const hasFields = hasFieldsForAad({
      ruleType: {
        hasFieldsForAAD: true,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: [],
    });

    expect(hasFields).toBeTruthy();
  });

  test('should return true if producer is SIEM', () => {
    const hasFields = hasFieldsForAad({
      ruleType: {
        hasFieldsForAAD: false,
        producer: AlertConsumers.SIEM,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: [],
    });

    expect(hasFields).toBeTruthy();
  });

  test('should return true if has alerts mappings', () => {
    const hasFields = hasFieldsForAad({
      ruleType: {
        hasFieldsForAAD: false,
        hasAlertsMappings: true,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: [],
    });

    expect(hasFields).toBeTruthy();
  });

  test('should return true if it is a multi-consumer rule and valid consumer contains it', () => {
    const hasFields = hasFieldsForAad({
      ruleType: {
        hasFieldsForAAD: true,
        id: ES_QUERY_ID,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: ['stackAlerts'],
    });

    expect(hasFields).toBeTruthy();
  });

  test('should return false if it is a multi-consumer rule and valid consumer does not contain it', () => {
    const hasFields = hasFieldsForAad({
      ruleType: {
        hasFieldsForAAD: true,
        id: ES_QUERY_ID,
      } as RuleTypeWithDescription,
      consumer: 'stackAlerts',
      validConsumers: ['logs'],
    });

    expect(hasFields).toBeFalsy();
  });
});
