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
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: scheduling',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    apiTest('scheduled execution uses its service account', async ({ apiClient }) => {
      const { headers, accountId, create, wait, expectAccount } = getContext();

      apiTest.setTimeout(150_000);
      const id = await create(
        apiClient,
        workflowYaml(accountId).replace(
          '  - type: manual',
          '  - type: scheduled\n    with:\n      every: 1m'
        )
      );
      const list = async (): Promise<WorkflowExecutionDto[]> => {
        const response = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        return response.body.results as WorkflowExecutionDto[];
      };
      await expect.poll(async () => (await list()).length, { timeout: 100_000 }).toBeGreaterThan(0);
      const [execution] = await list();
      expectAccount(await wait(apiClient, execution.id), accountId);
    });

    for (const rebind of [false, true]) {
      apiTest(
        `SA continuation audit: queued execution ${
          rebind ? 'rejects a changed binding' : 'retains its identity on promotion'
        }`,
        async ({ apiClient }) => {
          const {
            accountId,
            otherAccountId,
            create,
            updateYaml,
            expectIdentityFailure,
            run,
            wait,
            expectAccount,
            resume,
          } = getContext();

          apiTest.setTimeout(180_000);
          const yaml = workflowYaml(accountId, waitStep + authenticationStep).replace(
            'settings:',
            `settings:
  concurrency:
    max: 1
    strategy: queue
    key: cp2-queue-${Date.now()}`
          );
          const id = await create(apiClient, yaml);
          const firstId = await run(apiClient, id);
          const first = await wait(apiClient, firstId, 'waiting_for_input');
          const secondId = await run(apiClient, id);
          await wait(apiClient, secondId, 'queued');
          if (rebind) {
            await updateYaml(apiClient, id, yaml.replace(accountId, otherAccountId));
          }
          await resume(apiClient, {
            id,
            yaml,
            executionId: firstId,
            stepExecutionId: first.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          });
          if (rebind) {
            await wait(apiClient, firstId, 'failed');
            const rejected = await wait(apiClient, secondId, 'failed');
            expectIdentityFailure(rejected);
          } else {
            expectAccount(await wait(apiClient, firstId), accountId);
            const second = await wait(apiClient, secondId, 'waiting_for_input');
            await resume(apiClient, {
              id,
              yaml,
              executionId: secondId,
              stepExecutionId: second.stepExecutions?.find((step) => step.stepId === 'approval')
                ?.id,
            });
            expectAccount(await wait(apiClient, secondId), accountId);
          }
        }
      );
    }
  }
);
