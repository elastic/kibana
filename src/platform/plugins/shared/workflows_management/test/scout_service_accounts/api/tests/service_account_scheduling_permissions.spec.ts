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
import type { WorkflowExecutionDto } from '@kbn/workflows';
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
  '[NON-MKI] Workflow service accounts: scheduled execution permissions',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
    });

    apiTest.beforeAll(setup);

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    apiTest(
      'scheduled execution cannot use the scheduler privileges to write',
      async ({ apiClient, requestAuth, esClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, dataIndex, create, wait } = getContext();
        const admin = await requestAuth.getApiKey('admin');
        const headers = {
          ...admin.apiKeyHeader,
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        };
        const yaml = workflowYaml(
          readOnlyAccountId,
          authenticationStep + readStep(dataIndex) + writeStep(dataIndex, 'forbidden-schedule')
        ).replace('  - type: manual', '  - type: scheduled\n    with:\n      every: 1m');
        const id = await create(apiClient, yaml, headers);
        const list = async (): Promise<WorkflowExecutionDto[]> => {
          const response = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
            headers,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return response.body.results as WorkflowExecutionDto[];
        };
        await expect
          .poll(async () => (await list()).length, { timeout: 100_000 })
          .toBeGreaterThan(0);
        const [execution] = await list();
        expectReadOnlyFailure(
          await wait(apiClient, execution.id, 'failed', headers),
          readOnlyAccountId
        );
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-schedule' })).toBe(false);
      }
    );
  }
);
