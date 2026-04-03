/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

const mockWorkflowConnectors = {
  'mock-slack': {
    name: 'Mock Slack',
    actionTypeId: '.slack',
    config: {},
    secrets: { webhookUrl: 'https://hooks.slack.com/services/mock/mock/mock' },
  },
  'mock-email': {
    name: 'Mock Email',
    actionTypeId: '.email',
    config: {
      from: 'workflows@example.com',
      service: 'other',
      host: 'localhost',
      port: 25,
      secure: false,
    },
    secrets: {},
  },
  'mock-jira': {
    name: 'Mock Jira',
    actionTypeId: '.jira',
    config: { apiUrl: 'https://mock.atlassian.net', projectKey: 'MOCK' },
    secrets: { apiToken: 'mock-token', email: 'mock@example.com' },
  },
  'mock-pagerduty': {
    name: 'Mock PagerDuty',
    actionTypeId: '.pagerduty',
    config: { apiUrl: 'https://events.pagerduty.com/v2/enqueue' },
    secrets: { routingKey: 'mock-routing-key' },
  },
  'mock-teams': {
    name: 'Mock Teams',
    actionTypeId: '.teams',
    config: {},
    secrets: { webhookUrl: 'https://outlook.office.com/webhook/mock' },
  },
  'mock-servicenow': {
    name: 'Mock ServiceNow',
    actionTypeId: '.servicenow',
    config: { apiUrl: 'https://mock.service-now.com' },
    secrets: { username: 'mock', password: 'mock' },
  },
};

const preconfiguredArgPrefix = '--xpack.actions.preconfigured=';

function getMergedPreconfiguredArg(): string {
  const parentArgs = evalsTracingConfig.kbnTestServer.serverArgs;
  const existingArg = parentArgs.find((arg) => arg.startsWith(preconfiguredArgPrefix));
  const existingConnectors = existingArg
    ? JSON.parse(existingArg.slice(preconfiguredArgPrefix.length))
    : {};

  return `${preconfiguredArgPrefix}${JSON.stringify({
    ...existingConnectors,
    ...mockWorkflowConnectors,
  })}`;
}

export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs.filter(
        (arg) => !arg.startsWith(preconfiguredArgPrefix)
      ),
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      getMergedPreconfiguredArg(),
    ],
  },
};
