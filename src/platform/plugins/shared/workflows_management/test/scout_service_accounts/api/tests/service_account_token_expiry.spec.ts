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
import {
  expectReadOnlyFailure,
  readStep,
  writeStep,
} from '../fixtures/service_account_permissions';
import {
  authenticationStep,
  createServiceAccountSuite,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: Elasticsearch token expiry',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
      testConnectorPermissions: true,
    });
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);

    apiTest(
      'an uninterrupted execution retains read-only permissions after real expiry',
      async ({ apiClient, esClient }) => {
        apiTest.setTimeout(120_000);
        const { nodes } = await esClient.transport.request<{
          nodes: Record<string, { settings: Record<string, string> }>;
        }>({ method: 'GET', path: '/_nodes/settings', querystring: { flat_settings: true } });
        expect(Object.keys(nodes).length).toBeGreaterThan(0);
        for (const { settings } of Object.values(nodes)) {
          expect(settings['xpack.security.authc.token.timeout']).toBe('15s');
        }

        const timers = new Set<NodeJS.Timeout>();
        let delayRequests = 0;
        // Hold an HTTP step open so the execution keeps its scoped request. A waitForInput
        // or wait step would yield and acquire a fresh request instead of exercising renewal.
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
          const { readOnlyAccountId, dataIndex, create, run, wait, expectAccount } = getContext();
          const yaml = workflowYaml(
            readOnlyAccountId,
            `${authenticationStep.replace(
              'name: authenticate',
              'name: before_expiry'
            )}  - name: expire
    type: http
    with:
      method: GET
      url: http://127.0.0.1:${address.port}/expire
${authenticationStep + readStep(dataIndex) + writeStep(dataIndex, 'forbidden-after-expiry')}`
          );
          const id = await create(apiClient, yaml);
          const execution = await wait(apiClient, await run(apiClient, id), 'failed');
          const before = execution.stepExecutions?.find((step) => step.stepId === 'before_expiry');
          expect(before?.status, JSON.stringify(before?.error)).toBe('completed');
          expect(JSON.stringify(before?.output)).toContain(readOnlyAccountId);
          const delayed = execution.stepExecutions?.find((step) => step.stepId === 'expire');
          expect(delayed?.status, JSON.stringify(delayed?.error)).toBe('completed');
          expect(delayRequests).toBe(1);
          expectAccount(execution, readOnlyAccountId);
          expectReadOnlyFailure(execution, readOnlyAccountId);
          expect(await esClient.exists({ index: dataIndex, id: 'forbidden-after-expiry' })).toBe(
            false
          );
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
