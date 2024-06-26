/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transformCreateRuleBody } from './transform_create_rule_body';
import type { RuleTypeParams } from '../../types';
import type { CreateRuleBody } from './types';

const ruleToCreate: CreateRuleBody<RuleTypeParams> = {
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
  consumer: 'alerts',
  schedule: { interval: '1m' },
  tags: [],
  name: 'test',
  enabled: true,
  throttle: null,
  ruleTypeId: '.index-threshold',
  actions: [
    {
      group: 'threshold met',
      id: '83d4d860-9316-11eb-a145-93ab369a4461',
      params: {
        level: 'info',
        message: 'test-message',
      },
      actionTypeId: '.server-log',
      frequency: {
        notifyWhen: 'onActionGroupChange',
        throttle: null,
        summary: false,
      },
      useAlertDataForTemplate: true,
    },
    {
      id: '.test-system-action',
      params: {},
      actionTypeId: '.system-action',
    },
  ],
  notifyWhen: 'onActionGroupChange',
  alertDelay: {
    active: 10,
  },
};

describe('transformCreateRuleBody', () => {
  test('should transform create rule body', () => {
    expect(transformCreateRuleBody(ruleToCreate)).toEqual({
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
      consumer: 'alerts',
      schedule: { interval: '1m' },
      tags: [],
      name: 'test',
      enabled: true,
      throttle: null,
      notifyWhen: 'onActionGroupChange',
      rule_type_id: '.index-threshold',
      actions: [
        {
          group: 'threshold met',
          id: '83d4d860-9316-11eb-a145-93ab369a4461',
          params: {
            level: 'info',
            message: 'test-message',
          },
          frequency: {
            notify_when: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          use_alert_data_for_template: true,
        },
        { id: '.test-system-action', params: {} },
      ],

      alert_delay: { active: 10 },
    });
  });
});
