/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'events';
import { createServer } from 'http';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG } from '@kbn/workflows';
import {
  authenticationStep,
  createServiceAccountSuite,
  workflowYaml,
} from '../fixtures/service_account_suite';

const TOKEN_EXPIRY_TEST_TIMEOUT = 120_000;

const kibanaIdentityStep = `  - name: kibana_identity
    type: kibana.request
    with:
      method: GET
      path: /internal/security/me
`;

const forbiddenRolesStep = `  - name: forbidden_roles
    type: kibana.request
    with:
      method: GET
      path: /api/security/role
`;

const expectKibanaIdentity = (execution: WorkflowExecutionDto, accountId: string): void => {
  const step = execution.stepExecutions?.find(({ stepId }) => stepId === 'kibana_identity');
  expect(step?.status, JSON.stringify(step?.error)).toBe('completed');
  expect(step?.output).toMatchObject({ username: accountId });
};

const expectRolesDenied = (execution: WorkflowExecutionDto): void => {
  const step = execution.stepExecutions?.find(({ stepId }) => stepId === 'forbidden_roles');
  expect(step?.status).toBe('failed');
  expect(step?.error?.message).toContain('HTTP 403');
};

apiTest.describe(
  '[NON-MKI] Workflow service accounts: Kibana self-calls',
  { tag: ['@local-stateful-classic', '@local-serverless-search'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite();

    apiTest.beforeAll(async ({ apiServices, apiClient, samlAuth, config, esClient }) => {
      await apiServices.core.settings({
        'feature_flags.overrides': { [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: true },
      });
      await setup({ apiClient, samlAuth, config, esClient });
    });

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(async ({ apiServices, apiClient, esClient, config }) => {
      try {
        await teardown({ apiClient, esClient, config });
      } finally {
        await apiServices.core.settings({
          'feature_flags.overrides': { [WORKFLOWS_CORE_SELF_CLIENT_ENABLED_FLAG]: null },
        });
      }
    });

    apiTest(
      'authenticates a Kibana request as the bound service account',
      async ({ apiClient }) => {
        const { accountId, create, run, wait, expectAccount } = getContext();
        const id = await create(
          apiClient,
          workflowYaml(accountId, authenticationStep + kibanaIdentityStep)
        );
        const execution = await wait(apiClient, await run(apiClient, id));
        expectAccount(execution, accountId);
        expectKibanaIdentity(execution, accountId);
      }
    );

    apiTest(
      'keeps the service account permissions instead of the initiating admin permissions',
      async ({ apiClient }) => {
        const { readOnlyAccountId, create, run, wait, expectAccount } = getContext();
        const id = await create(
          apiClient,
          workflowYaml(
            readOnlyAccountId,
            authenticationStep + kibanaIdentityStep + forbiddenRolesStep
          )
        );
        const execution = await wait(apiClient, await run(apiClient, id), 'failed');
        expectAccount(execution, readOnlyAccountId);
        expectKibanaIdentity(execution, readOnlyAccountId);
        expectRolesDenied(execution);
      }
    );

    apiTest(
      'renews an expired token on the next Kibana request without elevating permissions',
      { tag: ['@local-stateful-classic'] },
      async ({ apiClient, esClient, config }) => {
        apiTest.skip(config.serverless, 'This test controls the Elasticsearch token lifetime.');
        apiTest.setTimeout(TOKEN_EXPIRY_TEST_TIMEOUT);
        const { nodes } = await esClient.transport.request<{
          nodes: Record<string, { settings: Record<string, string> }>;
        }>({ method: 'GET', path: '/_nodes/settings', querystring: { flat_settings: true } });
        expect(Object.keys(nodes).length).toBeGreaterThan(0);
        for (const { settings } of Object.values(nodes)) {
          expect(settings['xpack.security.authc.token.timeout']).toBe('15s');
        }

        const timers = new Set<NodeJS.Timeout>();
        let delayRequests = 0;
        // Keep the same execution request alive; a workflow wait would yield and mint a new one.
        const server = createServer((request, response) => {
          if (request.url !== '/expire') {
            response.writeHead(404).end();
            return;
          }
          delayRequests++;
          const timer = setTimeout(() => {
            timers.delete(timer);
            response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
          }, 16_000);
          timers.add(timer);
        });
        try {
          server.listen(0, '127.0.0.1');
          await once(server, 'listening');
          const address = server.address();
          if (!address || typeof address === 'string')
            throw new Error('Missing delay server address');
          const { readOnlyAccountId, create, run, wait, expectAccount } = getContext();
          const id = await create(
            apiClient,
            workflowYaml(
              readOnlyAccountId,
              `${
                authenticationStep +
                kibanaIdentityStep.replace('name: kibana_identity', 'name: before_expiry')
              }  - name: expire
    type: http
    with:
      method: GET
      url: http://127.0.0.1:${address.port}/expire
${kibanaIdentityStep}${forbiddenRolesStep}`
            )
          );
          const execution = await wait(apiClient, await run(apiClient, id), 'failed');
          expectAccount(execution, readOnlyAccountId);
          const before = execution.stepExecutions?.find(({ stepId }) => stepId === 'before_expiry');
          expect(before?.status, JSON.stringify(before?.error)).toBe('completed');
          expect(before?.output).toMatchObject({ username: readOnlyAccountId });
          const delay = execution.stepExecutions?.find(({ stepId }) => stepId === 'expire');
          expect(delay?.status, JSON.stringify(delay?.error)).toBe('completed');
          expect(delayRequests).toBe(1);
          // No Elasticsearch step runs after the delay: only the self-client can renew this token.
          expectKibanaIdentity(execution, readOnlyAccountId);
          expectRolesDenied(execution);
        } finally {
          for (const timer of timers) clearTimeout(timer);
          server.closeAllConnections();
          await new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve()))
          );
        }
      }
    );
  }
);
