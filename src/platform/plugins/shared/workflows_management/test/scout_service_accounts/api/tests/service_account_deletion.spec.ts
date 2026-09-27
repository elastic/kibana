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
import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: deletion',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const {
      getContext,
      setup,
      teardown,
      cleanupWorkflows: cleanupAfterTest,
    } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupAfterTest(apiClient));
    apiTest.afterAll(teardown);
    for (const bound of [false, true]) {
      apiTest(
        `returns conflict when force-deleting ${
          bound ? 'a bound' : 'an unbound'
        } workflow with a paused execution`,
        async ({ apiClient }) => {
          const {
            headers,
            accountId,
            create,
            run,
            wait,
            expectAccount,
            cleanupWorkflows,
            resume,
            expectPausedExecutionSearchable,
          } = getContext();

          apiTest.setTimeout(180_000);
          const yaml = workflowYaml(accountId, waitStep + authenticationStep);
          const id = await create(
            apiClient,
            bound ? yaml : yaml.replace(`settings:\n  run_as: ${accountId}\n`, '')
          );
          const executionId = await run(apiClient, id);
          try {
            const pausedExecution = await wait(apiClient, executionId, 'waiting_for_input');
            await expectPausedExecutionSearchable(apiClient, id, executionId);
            const response = await apiClient.delete(`api/workflows/workflow/${id}?force=true`, {
              headers,
              responseType: 'json',
            });
            expect(response, JSON.stringify(response.body)).toHaveStatusCode(409);
            const workflow = await apiClient.get(`api/workflows/workflow/${id}`, {
              headers,
              responseType: 'json',
            });
            expect(workflow).toHaveStatusCode(200);
            if (bound) {
              await resume(apiClient, {
                id,
                yaml,
                executionId,
                stepExecutionId: pausedExecution.stepExecutions?.find(
                  (step) => step.stepId === 'approval'
                )?.id,
              });
              expectAccount(await wait(apiClient, executionId), accountId);
            }
            await cleanupWorkflows(apiClient);
          } finally {
            await cleanupWorkflows(apiClient);
          }
        }
      );
    }

    apiTest(
      'cleanup continues after one failure and tolerates already deleted workflows',
      async ({ apiClient }) => {
        const { headers, accountId, workflowIds, create, cleanupWorkflows } = getContext();

        const firstId = await create(apiClient, workflowYaml(accountId));
        const secondId = await create(apiClient, workflowYaml(accountId));
        const failingClient = new Proxy(apiClient, {
          get(target, property) {
            if (property === 'put') {
              return (...args: Parameters<ApiClientFixture['put']>) => {
                if (args[0] === `api/workflows/workflow/${firstId}`) {
                  throw new Error('Injected cleanup failure');
                }
                return target.put(...args);
              };
            }
            return Reflect.get(target, property);
          },
        });
        await expect(cleanupWorkflows(failingClient)).rejects.toThrow('Workflow cleanup failed');
        expect(workflowIds.has(firstId)).toBe(true);
        expect(workflowIds.has(secondId)).toBe(false);
        const remaining = await apiClient.get(`api/workflows/workflow/${secondId}`, {
          headers,
          responseType: 'json',
        });
        expect(remaining).toHaveStatusCode(404);
        workflowIds.add(secondId);
        await cleanupWorkflows(apiClient);
        expect(workflowIds.size).toBe(0);
      }
    );

    apiTest('cleanup removes a workflow left paused for input', async ({ apiClient }) => {
      const { headers, cleanupWorkflows, pause, expectPausedExecutionSearchable } = getContext();

      apiTest.setTimeout(180_000);
      const paused = await pause(apiClient);
      try {
        await expectPausedExecutionSearchable(apiClient, paused.id, paused.executionId);
        await cleanupWorkflows(apiClient);
        const workflow = await apiClient.get(`api/workflows/workflow/${paused.id}`, {
          headers,
          responseType: 'json',
        });
        expect(workflow).toHaveStatusCode(404);
      } finally {
        // Recover the fixture even when the cleanup under test fails before deleting it.
        await cleanupWorkflows(apiClient);
      }
    });
  }
);
