/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleTypeParams } from '../../types';
import { createRule } from './create_rule';
import { CreateRuleBody } from './types';

const http = httpServiceMock.createStartContract();

describe('createRule', () => {
  beforeEach(() => jest.resetAllMocks());

  test('should call create alert API', async () => {
    const resolvedValue = {
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
      rule_type_id: '.index-threshold',
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          connector_type_id: '.server-log',
          frequency: {
            notify_when: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: '.test-system-action',
          params: {},
          connector_type_id: '.system-action',
        },
      ],
      scheduled_task_id: '1',
      execution_status: { status: 'pending', last_execution_date: '2021-04-01T21:33:13.250Z' },
      create_at: '2021-04-01T21:33:13.247Z',
      updated_at: '2021-04-01T21:33:13.247Z',
      alert_delay: {
        active: 10,
      },
      flapping: {
        look_back_window: 10,
        status_change_threshold: 10,
      },
    };

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
            message:
              "Rule '{{rule.name}}' is active for group '{{context.group}}':\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}",
          },
          actionTypeId: '.server-log',
          frequency: {
            notifyWhen: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: '.test-system-action',
          params: {},
          actionTypeId: '.system-action',
        },
      ],
      notifyWhen: null,
      alertDelay: {
        active: 10,
      },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createRule({ http, rule: ruleToCreate as CreateRuleBody });
    expect(http.post).toHaveBeenCalledWith('/api/alerting/rule', {
      body: '{"params":{"aggType":"count","termSize":5,"thresholdComparator":">","timeWindowSize":5,"timeWindowUnit":"m","groupBy":"all","threshold":[1000],"index":[".kibana"],"timeField":"alert.executionStatus.lastExecutionDate"},"consumer":"alerts","schedule":{"interval":"1m"},"tags":[],"name":"test","enabled":true,"throttle":null,"rule_type_id":".index-threshold","actions":[{"group":"threshold met","id":"83d4d860-9316-11eb-a145-93ab369a4461","params":{"level":"info","message":"Rule \'{{rule.name}}\' is active for group \'{{context.group}}\':\\n\\n- Value: {{context.value}}\\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\\n- Timestamp: {{context.date}}"},"frequency":{"notify_when":"onActionGroupChange","throttle":null,"summary":false}},{"id":".test-system-action","params":{}}],"alert_delay":{"active":10},"flapping":{"look_back_window":10,"status_change_threshold":10}}',
    });

    expect(result).toEqual({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          frequency: {
            notifyWhen: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
        {
          id: '.test-system-action',
          params: {},
          actionTypeId: '.system-action',
        },
      ],
      ruleTypeId: '.index-threshold',
      apiKeyOwner: undefined,
      consumer: 'alerts',
      create_at: '2021-04-01T21:33:13.247Z',
      createdAt: undefined,
      createdBy: undefined,
      executionStatus: {
        lastExecutionDate: '2021-04-01T21:33:13.250Z',
        status: 'pending',
      },
      muteAll: undefined,
      mutedInstanceIds: undefined,
      name: 'test',
      params: {
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
      schedule: {
        interval: '1m',
      },
      scheduledTaskId: '1',
      tags: [],
      updatedAt: '2021-04-01T21:33:13.247Z',
      updatedBy: undefined,
      alertDelay: {
        active: 10,
      },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
    });
  });

  test('should call create alert API with notifyWhen at rule level', async () => {
    const resolvedValue = {
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
      rule_type_id: '.index-threshold',
      notify_when: 'onThrottleInterval',
      throttle: '1d',
      actions: [
        {
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
          connector_type_id: '.server-log',
        },
        {
          id: '.test-system-action',
          params: {},
          connector_type_id: '.system-action',
        },
      ],
      scheduled_task_id: '1',
      execution_status: { status: 'pending', last_execution_date: '2021-04-01T21:33:13.250Z' },
      create_at: '2021-04-01T21:33:13.247Z',
      updated_at: '2021-04-01T21:33:13.247Z',
      alert_delay: {
        active: 10,
      },
      flapping: {
        look_back_window: 10,
        status_change_threshold: 10,
      },
    };

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
      notifyWhen: 'onThrottleInterval',
      throttle: '1d',
      ruleTypeId: '.index-threshold',
      actions: [
        {
          group: 'threshold met',
          id: '83d4d860-9316-11eb-a145-93ab369a4461',
          params: {
            level: 'info',
            message:
              "Rule '{{rule.name}}' is active for group '{{context.group}}':\n\n- Value: {{context.value}}\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\n- Timestamp: {{context.date}}",
          },
          actionTypeId: '.server-log',
        },
        {
          id: '.test-system-action',
          params: {},
          actionTypeId: '.system-action',
        },
      ],
      alertDelay: {
        active: 10,
      },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
    };
    http.post.mockResolvedValueOnce(resolvedValue);

    const result = await createRule({ http, rule: ruleToCreate as CreateRuleBody });
    expect(http.post).toHaveBeenCalledWith('/api/alerting/rule', {
      body: '{"params":{"aggType":"count","termSize":5,"thresholdComparator":">","timeWindowSize":5,"timeWindowUnit":"m","groupBy":"all","threshold":[1000],"index":[".kibana"],"timeField":"alert.executionStatus.lastExecutionDate"},"consumer":"alerts","schedule":{"interval":"1m"},"tags":[],"name":"test","enabled":true,"throttle":"1d","rule_type_id":".index-threshold","notify_when":"onThrottleInterval","actions":[{"group":"threshold met","id":"83d4d860-9316-11eb-a145-93ab369a4461","params":{"level":"info","message":"Rule \'{{rule.name}}\' is active for group \'{{context.group}}\':\\n\\n- Value: {{context.value}}\\n- Conditions Met: {{context.conditions}} over {{rule.params.timeWindowSize}}{{rule.params.timeWindowUnit}}\\n- Timestamp: {{context.date}}"}},{"id":".test-system-action","params":{}}],"alert_delay":{"active":10},"flapping":{"look_back_window":10,"status_change_threshold":10}}',
    });

    expect(result).toEqual({
      actions: [
        {
          actionTypeId: '.server-log',
          group: 'threshold met',
          id: '1',
          params: {
            level: 'info',
            message: 'alert ',
          },
        },
        {
          id: '.test-system-action',
          params: {},
          actionTypeId: '.system-action',
        },
      ],
      ruleTypeId: '.index-threshold',
      notifyWhen: 'onThrottleInterval',
      throttle: '1d',
      apiKeyOwner: undefined,
      consumer: 'alerts',
      create_at: '2021-04-01T21:33:13.247Z',
      createdAt: undefined,
      createdBy: undefined,
      executionStatus: {
        lastDuration: undefined,
        lastExecutionDate: '2021-04-01T21:33:13.250Z',
        status: 'pending',
      },
      isSnoozedUntil: undefined,
      activeSnoozes: undefined,
      muteAll: undefined,
      mutedInstanceIds: undefined,
      name: 'test',
      params: {
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
      schedule: {
        interval: '1m',
      },
      scheduledTaskId: '1',
      snoozeSchedule: undefined,
      tags: [],
      updatedAt: '2021-04-01T21:33:13.247Z',
      updatedBy: undefined,
      alertDelay: {
        active: 10,
      },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
    });
  });
});
