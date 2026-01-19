/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CaseCreateRequest } from '../../../src/playwright/fixtures/scope/worker/apis/cases/types';

export const createAlertRuleParams = {
  aggType: 'count',
  termSize: 5,
  thresholdComparator: '>',
  timeWindowSize: 5,
  timeWindowUnit: 'm',
  groupBy: 'all',
  threshold: [10],
  index: ['.kibana-event-log-*'],
  timeField: '@timestamp',
};

export const createCasePayload: CaseCreateRequest = {
  title: 'test',
  tags: ['scout'],
  category: null,
  severity: 'low',
  description: 'integration test',
  connector: {
    id: 'none',
    name: 'none',
    type: '.none',
    fields: null,
  },
  settings: {
    syncAlerts: true,
    extractObservables: false,
  },
  owner: '',
  customFields: [],
};
