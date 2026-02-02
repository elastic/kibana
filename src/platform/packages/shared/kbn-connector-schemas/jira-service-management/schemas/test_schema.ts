/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CloseAlertParams, CreateAlertParams } from '../types/v1';

export const ValidCreateAlertSchema: CreateAlertParams = {
  message: 'a message',
  alias: 'an alias',
  description: 'a description',
  responders: [
    {
      id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c',
      type: 'team',
    },
    {
      id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8',
      type: 'user',
    },
    {
      id: 'aee8a0de-c80f-4515-a232-501c0bc9d715',
      type: 'escalation',
    },
    {
      id: '80564037-1984-4f38-b98e-8a1f662df552',
      type: 'schedule',
    },
  ],
  visibleTo: [
    { id: 'id for team', type: 'team' },
    { id: 'id for user', type: 'user' },
  ],
  actions: ['action1', 'action2'],
  tags: ['tag1', 'tag2'],
  details: { keyA: 'valueA', keyB: 'valueB' },
  entity: 'an entity',
  source: 'a source',
  priority: 'P2',
  user: 'a user',
  note: 'a note',
};

/**
 * This example is pulled from the sample curl request here: https://docs.opsgenie.com/docs/alert-api#create-alert
 */
export const JiraServiceManagementCreateAlertExample: CreateAlertParams = {
  message: 'An example alert message',
  alias: 'Life is too short for no alias',
  description: 'Every alert needs a description',
  responders: [
    { id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c', type: 'team' },
    { id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8', type: 'user' },
    { id: 'aee8a0de-c80f-4515-a232-501c0bc9d715', type: 'escalation' },
    { id: '80564037-1984-4f38-b98e-8a1f662df552', type: 'schedule' },
  ],
  visibleTo: [
    { id: '4513b7ea-3b91-438f-b7e4-e3e54af9147c', type: 'team' },
    { id: 'bb4d9938-c3c2-455d-aaab-727aa701c0d8', type: 'user' },
  ],
  actions: ['Restart', 'AnExampleAction'],
  tags: ['OverwriteQuietHours', 'Critical'],
  details: { key1: 'value1', key2: 'value2' },
  entity: 'An example entity',
  priority: 'P1',
};

/**
 * This example is pulled from the sample curl request here: https://docs.opsgenie.com/docs/alert-api#close-alert
 * with the addition of the alias field.
 */
export const JiraServiceManagementCloseAlertExample: CloseAlertParams = {
  alias: '123',
  user: 'Monitoring Script',
  source: 'AWS Lambda',
  note: 'Action executed via Alert API',
};
