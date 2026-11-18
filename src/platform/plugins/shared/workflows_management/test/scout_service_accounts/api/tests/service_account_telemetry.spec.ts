/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createServiceAccountSuite, workflowYaml } from '../fixtures/service_account_suite';

const COMPLETED_EVENT_TYPE = 'workflows_execution_workflow_completed';

const getCompletedEventProperties = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  workflowExecutionId: string
): Promise<Record<string, unknown>> => {
  const query = new URLSearchParams({
    takeNumberOfEvents: '1',
    withTimeoutMs: '10000',
    eventTypes: JSON.stringify([COMPLETED_EVENT_TYPE]),
    filters: JSON.stringify({ 'properties.workflowExecutionId': { eq: workflowExecutionId } }),
  });
  const response = await apiClient.get(`internal/analytics_ftr_helpers/events?${query}`, {
    headers,
    responseType: 'json',
  });
  expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
  expect(response.body).toHaveLength(1);
  return response.body[0].properties;
};

interface BoundWorkloadsUsage {
  total: number;
  serviceAccounts: number;
  byWorkload: Array<{ pluginId: string; workloadType: string; count: number }>;
  byBinderType: Record<string, number>;
}

const getServiceAccountsUsage = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>
): Promise<{ enabled: boolean; boundWorkloads?: BoundWorkloadsUsage }> => {
  const response = await apiClient.post('internal/telemetry/clusters/_stats', {
    headers: { ...headers, 'elastic-api-version': '2' },
    body: { unencrypted: true, refreshCache: true },
    responseType: 'json',
  });
  expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
  return response.body[0].stats.stack_stats.kibana.plugins.security.serviceAccounts;
};

apiTest.describe(
  '[NON-MKI] Workflow service accounts: telemetry',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(async ({ apiClient, samlAuth, requestAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, requestAuth, config, esClient });
      const optedIn = await apiClient.post('internal/analytics_ftr_helpers/opt_in?consent=true', {
        headers: getContext().sessionHeaders,
        responseType: 'json',
      });
      expect(optedIn).toHaveStatusCode(200);
    });

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    apiTest('reports runAs user for a workflow without run_as', async ({ apiClient }) => {
      const { sessionHeaders, accountId, create, run, wait } = getContext();
      const id = await create(
        apiClient,
        workflowYaml(accountId).replace(`settings:\n  run_as: ${accountId}\n`, '')
      );
      const execution = await wait(apiClient, await run(apiClient, id));
      expect(execution.effectiveIdentity).toBeUndefined();

      const properties = await getCompletedEventProperties(apiClient, sessionHeaders, execution.id);
      expect(properties.runAs).toBe('user');
      expect(properties.runAsInherited).toBeUndefined();
    });

    apiTest(
      'reports runAs service_account for a workflow bound by its own run_as',
      async ({ apiClient }) => {
        const { sessionHeaders, accountId, create, run, wait, expectAccount } = getContext();
        const id = await create(apiClient, workflowYaml(accountId));
        const execution = await wait(apiClient, await run(apiClient, id));
        expectAccount(execution, accountId);

        const properties = await getCompletedEventProperties(
          apiClient,
          sessionHeaders,
          execution.id
        );
        expect(properties).toMatchObject({ runAs: 'service_account', runAsInherited: false });
        expect(JSON.stringify(properties)).not.toContain(accountId);
      }
    );

    apiTest(
      'reports a workflow bound by its own run_as in the security usage collector',
      async ({ apiClient }) => {
        const { headers, accountId, create } = getContext();
        await create(apiClient, workflowYaml(accountId));

        const { enabled, boundWorkloads } = await getServiceAccountsUsage(apiClient, headers);
        expect(enabled).toBe(true);
        expect(boundWorkloads?.total).toBeGreaterThanOrEqual(1);
        expect(boundWorkloads?.serviceAccounts).toBeGreaterThanOrEqual(1);
        const workflows = boundWorkloads?.byWorkload.find(
          ({ pluginId, workloadType }) =>
            pluginId === 'workflowsExecutionEngine' && workloadType === 'workflow'
        );
        expect(workflows?.count).toBeGreaterThanOrEqual(1);
        expect(boundWorkloads?.byBinderType.user).toBeGreaterThanOrEqual(1);
      }
    );
  }
);
