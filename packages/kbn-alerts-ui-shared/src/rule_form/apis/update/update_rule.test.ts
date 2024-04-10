/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { RuleFormRule } from '../../types';
import { updateRule } from './update_rule';

const http = httpServiceMock.createStartContract();

describe('updateRule', () => {
  test('should call rule update API', async () => {
    const ruleToUpdate: RuleFormRule = {
      id: '12/3',
      ruleTypeId: 'test',
      consumer: 'alerts',
      name: 'test',
      tags: ['foo'],
      schedule: {
        interval: '1m',
      },
      params: {},
      alertDelay: {
        active: 10,
      },
      actions: [
        //* Enable this in the next PR which adds action support *
        // {
        //   group: 'default',
        //   id: '2',
        //   actionTypeId: 'test',
        //   params: {},
        //   useAlertDataForTemplate: false,
        //   frequency: {
        //     notifyWhen: 'onActionGroupChange',
        //     throttle: null,
        //     summary: false,
        //   },
        // },
        // {
        //   id: '.test-system-action',
        //   params: {},
        //   actionTypeId: '.system-action',
        // },
      ],
    };

    const resolvedValue = {
      ...ruleToUpdate,
      enabled: true,
      createdBy: null,
      updatedBy: null,
      muteAll: false,
      mutedInstanceIds: [],
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
      },
      revision: 1,
    };

    http.put.mockResolvedValueOnce({
      ...resolvedValue,
      actions: [
        {
          group: 'default',
          id: '2',
          connector_type_id: 'test',
          params: {},
          use_alert_data_for_template: false,
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
    });

    const result = await updateRule({ http, id: '12/3', rule: ruleToUpdate });

    expect(result).toEqual({
      ...resolvedValue,
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
        {
          id: '.test-system-action',
          params: {},
          actionTypeId: '.system-action',
        },
      ],
    });
    expect(http.put.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule/12%2F3",
        Object {
          "body": "{\\"name\\":\\"test\\",\\"tags\\":[\\"foo\\"],\\"schedule\\":{\\"interval\\":\\"1m\\"},\\"params\\":{},\\"actions\\":[{\\"group\\":\\"default\\",\\"id\\":\\"2\\",\\"params\\":{},\\"frequency\\":{\\"notify_when\\":\\"onActionGroupChange\\",\\"throttle\\":null,\\"summary\\":false},\\"use_alert_data_for_template\\":false},{\\"id\\":\\".test-system-action\\",\\"params\\":{}}],\\"alert_delay\\":{\\"active\\":10}}",
        },
      ]
    `);
  });
});
