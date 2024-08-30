/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { validateRuleBase, validateRuleParams, hasRuleErrors } from './validate_form';
import { RuleFormData } from '../types';
import {
  CONSUMER_REQUIRED_TEXT,
  INTERVAL_MINIMUM_TEXT,
  INTERVAL_REQUIRED_TEXT,
  NAME_REQUIRED_TEXT,
  RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT,
  RULE_TYPE_REQUIRED_TEXT,
} from '../translations';
import { formatDuration } from '../utils';
import { RuleTypeModel } from '../../common';

const formDataMock: RuleFormData = {
  params: {
    aggType: 'count',
    termSize: 5,
    thresholdComparator: '>',
    timeWindowSize: 5,
    timeWindowUnit: 'm',
    groupBy: 'all',
    threshold: [1000],
    index: ['.kibana'],
    timeField: 'alert.executionStatus.lastExecutionDate',
  },
  consumer: 'stackAlerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

const ruleTypeModelMock = {
  validate: jest.fn().mockReturnValue({
    errors: {
      someError: 'test',
    },
  }),
};

describe('validateRuleBase', () => {
  test('should validate name', () => {
    const result = validateRuleBase({
      formData: {
        ...formDataMock,
        name: '',
      },
    });
    expect(result.name).toEqual([NAME_REQUIRED_TEXT]);
  });

  test('should validate consumer', () => {
    const result = validateRuleBase({
      formData: {
        ...formDataMock,
        consumer: '',
      },
    });
    expect(result.consumer).toEqual([CONSUMER_REQUIRED_TEXT]);
  });

  test('should validate schedule', () => {
    let result = validateRuleBase({
      formData: {
        ...formDataMock,
        schedule: {
          interval: '1',
        },
      },
    });
    expect(result.interval).toEqual([INTERVAL_REQUIRED_TEXT]);

    result = validateRuleBase({
      formData: {
        ...formDataMock,
        schedule: {
          interval: '1m',
        },
      },
      minimumScheduleInterval: {
        value: '5m',
        enforce: true,
      },
    });
    expect(result.interval).toEqual([INTERVAL_MINIMUM_TEXT(formatDuration('5m', true))]);
  });

  test('should validate rule type ID', () => {
    const result = validateRuleBase({
      formData: {
        ...formDataMock,
        ruleTypeId: '',
      },
    });
    expect(result.ruleTypeId).toEqual([RULE_TYPE_REQUIRED_TEXT]);
  });

  test('should validate alert delay', () => {
    const result = validateRuleBase({
      formData: {
        ...formDataMock,
        alertDelay: {
          active: 0,
        },
      },
    });
    expect(result.alertDelay).toEqual([RULE_ALERT_DELAY_BELOW_MINIMUM_TEXT]);
  });
});

describe('validateRuleParams', () => {
  test('should validate rule params', () => {
    const result = validateRuleParams({
      formData: formDataMock,
      ruleTypeModel: ruleTypeModelMock as unknown as RuleTypeModel,
      isServerless: false,
    });

    expect(ruleTypeModelMock.validate).toHaveBeenCalledWith(
      {
        aggType: 'count',
        groupBy: 'all',
        index: ['.kibana'],
        termSize: 5,
        threshold: [1000],
        thresholdComparator: '>',
        timeField: 'alert.executionStatus.lastExecutionDate',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
      },
      false
    );

    expect(result).toEqual({
      someError: 'test',
    });
  });
});
describe('hasRuleErrors', () => {
  test('should return false if there are no errors', () => {
    const result = hasRuleErrors({
      baseErrors: {},
      paramsErrors: {},
    });

    expect(result).toBeFalsy();
  });

  test('should return true if base has errors', () => {
    const result = hasRuleErrors({
      baseErrors: {
        name: ['error'],
      },
      paramsErrors: {},
    });

    expect(result).toBeTruthy();
  });

  test('should return true if params have errors', () => {
    let result = hasRuleErrors({
      baseErrors: {},
      paramsErrors: {
        someValue: ['error'],
      },
    });

    expect(result).toBeTruthy();

    result = hasRuleErrors({
      baseErrors: {},
      paramsErrors: {
        someNestedValue: {
          someValue: ['error'],
        },
      },
    });

    expect(result).toBeTruthy();
  });
});
