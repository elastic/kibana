/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { updateRule, UpdateRuleBody } from '.';

const http = httpServiceMock.createStartContract();

describe('updateRule', () => {
  test('should call rule update API', async () => {
    const updatedRule = {
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
      create_by: 'user',
      updated_by: 'user',
      alert_delay: {
        active: 10,
      },
      flapping: {
        look_back_window: 10,
        status_change_threshold: 10,
      },
    };

    const updateRuleBody = {
      name: 'test-update',
      tags: ['foo', 'bar'],
      schedule: {
        interval: '5m',
      },
      params: {},
      alertDelay: {
        active: 50,
      },
      actions: [
        {
          group: 'default',
          id: '2',
          actionTypeId: 'test',
          params: {},
          useAlertDataForTemplate: false,
          frequency: {
            notifyWhen: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
      ],
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
    };

    http.put.mockResolvedValueOnce({
      ...updatedRule,
      name: 'test-update',
      tags: ['foo', 'bar'],
      schedule: {
        interval: '5m',
      },
      params: {},
      alert_delay: {
        active: 50,
      },
      actions: [
        {
          group: 'default',
          id: '2',
          action_type_dd: 'test',
          params: {},
          use_alert_data_for_template: false,
          frequency: {
            notify_when: 'onActionGroupChange',
            throttle: null,
            summary: false,
          },
        },
      ],
      flapping: {
        look_back_window: 10,
        status_change_threshold: 10,
      },
    });

    const result = await updateRule({ http, id: '12/3', rule: updateRuleBody as UpdateRuleBody });

    expect(result).toEqual({
      actions: [
        {
          frequency: {
            notifyWhen: 'onActionGroupChange',
            summary: false,
            throttle: null,
          },
          group: 'default',
          id: '2',
          params: {},
          useAlertDataForTemplate: false,
        },
      ],
      alertDelay: {
        active: 50,
      },
      consumer: 'alerts',
      create_at: '2021-04-01T21:33:13.247Z',
      create_by: 'user',
      executionStatus: {
        lastExecutionDate: '2021-04-01T21:33:13.250Z',
        status: 'pending',
      },
      flapping: {
        lookBackWindow: 10,
        statusChangeThreshold: 10,
      },
      name: 'test-update',
      params: {},
      ruleTypeId: '.index-threshold',
      schedule: {
        interval: '5m',
      },
      scheduledTaskId: '1',
      tags: ['foo', 'bar'],
      updatedAt: '2021-04-01T21:33:13.247Z',
      updatedBy: 'user',
    });

    expect(http.put).toHaveBeenCalledWith('/api/alerting/rule/12%2F3', {
      body: '{"name":"test-update","tags":["foo","bar"],"schedule":{"interval":"5m"},"params":{},"actions":[{"group":"default","id":"2","params":{},"frequency":{"notify_when":"onActionGroupChange","throttle":null,"summary":false},"use_alert_data_for_template":false}],"alert_delay":{"active":50},"flapping":{"look_back_window":10,"status_change_threshold":10}}',
    });
  });
});
