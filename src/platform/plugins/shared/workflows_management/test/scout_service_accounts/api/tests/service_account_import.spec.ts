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

import { createServiceAccountSuite, workflowYaml } from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: import',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    apiTest(
      'clone and bulk import create independent bindings, and overwrite can unbind',
      async ({ apiClient }) => {
        const {
          headers,
          accountId,
          otherAccountId,
          workflowIds,
          create,
          run,
          wait,
          expectAccount,
        } = getContext();

        apiTest.setTimeout(120_000);
        const originalId = await create(apiClient, workflowYaml(accountId));
        const clone = await apiClient.post(`api/workflows/workflow/${originalId}/clone`, {
          headers,
          responseType: 'json',
        });
        expect(clone, JSON.stringify(clone.body)).toHaveStatusCode(200);
        workflowIds.add(clone.body.id);
        const enabled = await apiClient.put(`api/workflows/workflow/${clone.body.id}`, {
          headers,
          body: { enabled: true },
          responseType: 'json',
        });
        expect(enabled, JSON.stringify(enabled.body)).toHaveStatusCode(200);
        expectAccount(await wait(apiClient, await run(apiClient, clone.body.id)), accountId);
        const id = `cp2-import-${Date.now()}`;
        const imported = await apiClient.post('api/workflows', {
          headers,
          body: { workflows: [{ id, yaml: workflowYaml(otherAccountId) }] },
          responseType: 'json',
        });
        expect(imported, JSON.stringify(imported.body)).toHaveStatusCode(200);
        expect(imported.body.failed as object[]).toHaveLength(0);
        workflowIds.add(id);
        expectAccount(await wait(apiClient, await run(apiClient, id)), otherAccountId);
        const overwrite = await apiClient.post('api/workflows?overwrite=true', {
          headers,
          body: {
            workflows: [
              {
                id,
                yaml: workflowYaml(otherAccountId).replace(
                  `settings:\n  run_as: ${otherAccountId}\n`,
                  ''
                ),
              },
            ],
          },
          responseType: 'json',
        });
        expect(overwrite, JSON.stringify(overwrite.body)).toHaveStatusCode(200);
        expect(overwrite.body.failed as object[]).toHaveLength(0);
        const execution = await wait(apiClient, await run(apiClient, id));
        expect(execution.effectiveIdentity).toBeUndefined();
      }
    );
  }
);
