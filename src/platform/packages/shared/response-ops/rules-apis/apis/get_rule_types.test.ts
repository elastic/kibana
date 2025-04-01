/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRuleTypes } from './get_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();

const ruleTypeResponse = {
  id: '1',
  name: 'name',
  action_groups: [
    {
      id: 'default',
      name: 'Default',
    },
  ],
  action_variables: {
    context: [],
    state: [],
  },
  alerts: [],
  authorized_consumers: {},
  category: 'test',
  default_action_group_id: 'default',
  default_schedule_interval: '10m',
  does_set_recovery_context: false,
  enabled_in_license: true,
  has_alerts_mappings: true,
  has_fields_for_a_a_d: false,
  is_exportable: true,
  minimum_license_required: 'basic',
  producer: 'test',
  recovery_action_group: {
    id: 'recovered',
    name: 'Recovered',
  },
  rule_task_timeout: '10m',
};

const expectedRuleType = {
  id: '1',
  name: 'name',
  actionGroups: [
    {
      id: 'default',
      name: 'Default',
    },
  ],
  actionVariables: {
    context: [],
    state: [],
  },
  alerts: [],
  authorizedConsumers: {},
  category: 'test',
  defaultActionGroupId: 'default',
  defaultScheduleInterval: '10m',
  doesSetRecoveryContext: false,
  enabledInLicense: true,
  hasAlertsMappings: true,
  hasFieldsForAAD: false,
  isExportable: true,
  minimumLicenseRequired: 'basic',
  producer: 'test',
  recoveryActionGroup: {
    id: 'recovered',
    name: 'Recovered',
  },
  ruleTaskTimeout: '10m',
};

describe('getRuleTypes', () => {
  it('should call the rule types API and transform the response case', async () => {
    http.get.mockResolvedValueOnce([ruleTypeResponse]);

    const result = await getRuleTypes({
      http,
    });

    expect(result).toEqual([expectedRuleType]);

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule_types",
      ]
    `);
  });
});
