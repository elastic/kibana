/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createServiceAccountSuite } from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Managed workflow service account routes',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    apiTest(
      'managed workflow installs, executes and rebinds with its service account',
      async ({ apiClient }) => {
        const { headers, accountId, otherAccountId, managedIds, managedPath, wait, expectAccount } =
          getContext();

        const id = `cp2-${Date.now()}`;
        managedIds.add(id);
        for (const serviceAccountId of [accountId, otherAccountId]) {
          const installed = await apiClient.post(managedPath(id), {
            headers,
            body: { serviceAccountId },
            responseType: 'json',
          });
          expect(installed, JSON.stringify(installed.body)).toHaveStatusCode(200);
          const saved = await apiClient.get(`api/workflows/workflow/${installed.body.workflowId}`, {
            headers,
            responseType: 'json',
          });
          expect(saved, JSON.stringify(saved.body)).toHaveStatusCode(200);
          expect(saved.body).toMatchObject({
            managed: true,
            managedBy: 'workflowsExtensionsExample',
            definition: { settings: { run_as: serviceAccountId } },
          });
          const executed = await apiClient.post(`${managedPath(id)}/run`, {
            headers,
            body: {},
            responseType: 'json',
          });
          expect(executed, JSON.stringify(executed.body)).toHaveStatusCode(200);
          expectAccount(await wait(apiClient, executed.body.workflowExecutionId), serviceAccountId);
        }
      }
    );

    apiTest(
      'managed workflow allows execution but rejects SA mutations without manage_security',
      async ({ apiClient, samlAuth }) => {
        const { headers, accountId, otherAccountId, managedIds, managedPath, wait, expectAccount } =
          getContext();

        const id = `cp2-${Date.now()}`;
        managedIds.add(id);
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        });
        const executorHeaders = { ...headers, ...cookieHeader };
        const executor = await apiClient.get('internal/security/me', {
          headers: executorHeaders,
          responseType: 'json',
        });
        expect(executor).toHaveStatusCode(200);
        const deniedInstall = await apiClient.post(managedPath(id), {
          headers: executorHeaders,
          body: { serviceAccountId: accountId },
          responseType: 'json',
        });
        expect(deniedInstall, JSON.stringify(deniedInstall.body)).toHaveStatusCode(403);
        const installed = await apiClient.post(managedPath(id), {
          headers,
          body: { serviceAccountId: accountId },
          responseType: 'json',
        });
        expect(installed, JSON.stringify(installed.body)).toHaveStatusCode(200);
        const deniedRebind = await apiClient.post(managedPath(id), {
          headers: executorHeaders,
          body: { serviceAccountId: otherAccountId },
          responseType: 'json',
        });
        expect(deniedRebind, JSON.stringify(deniedRebind.body)).toHaveStatusCode(403);
        const deniedDelete = await apiClient.delete(managedPath(id), {
          headers: executorHeaders,
          responseType: 'json',
        });
        expect(deniedDelete, JSON.stringify(deniedDelete.body)).toHaveStatusCode(403);
        const executed = await apiClient.post(`${managedPath(id)}/run`, {
          headers: executorHeaders,
          body: {},
          responseType: 'json',
        });
        expect(executed, JSON.stringify(executed.body)).toHaveStatusCode(200);
        expectAccount(
          await wait(apiClient, executed.body.workflowExecutionId),
          accountId,
          executor.body
        );
      }
    );
  }
);
