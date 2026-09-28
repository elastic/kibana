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
  '[NON-MKI] Workflow service accounts: events',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    apiTest(
      'SA continuation audit: binding failure dispatches the failure handler',
      async ({ apiClient }) => {
        const { headers, accountId, otherAccountId, create, run, wait, expectAccount, resume } =
          getContext();

        apiTest.setTimeout(180_000);
        const sourceId = await create(
          apiClient,
          workflowYaml(
            accountId,
            `  - name: expected_failure
    type: elasticsearch.request
    with:
      method: GET
      path: /cp2-no-such-index-${Date.now()}/_doc/missing
`
          )
        );
        const handlerId = await create(
          apiClient,
          workflowYaml(otherAccountId).replace(
            '  - type: manual',
            `  - type: workflows.failed
    on:
      condition: 'event.workflow.id: "${sourceId}"'`
          )
        );
        const handlerExecutions = async (): Promise<WorkflowExecutionDto[]> => {
          const response = await apiClient.get(`api/workflows/workflow/${handlerId}/executions`, {
            headers,
            responseType: 'json',
          });
          expect(response).toHaveStatusCode(200);
          return response.body.results;
        };
        await wait(apiClient, await run(apiClient, sourceId), 'failed');
        await expect
          .poll(async () => (await handlerExecutions()).length, { timeout: 30_000 })
          .toBe(1);
        const control = (await handlerExecutions())[0];
        expectAccount(await wait(apiClient, control.id), otherAccountId);
        const yaml = workflowYaml(accountId, waitStep + authenticationStep);
        const updated = await apiClient.put(`api/workflows/workflow/${sourceId}`, {
          headers,
          body: { yaml },
          responseType: 'json',
        });
        expect(updated).toHaveStatusCode(200);
        const executionId = await run(apiClient, sourceId);
        const paused = await wait(apiClient, executionId, 'waiting_for_input');
        const rebound = await apiClient.put(`api/workflows/workflow/${sourceId}`, {
          headers,
          body: { yaml: yaml.replace(accountId, otherAccountId) },
          responseType: 'json',
        });
        expect(rebound).toHaveStatusCode(200);
        await resume(apiClient, {
          id: sourceId,
          yaml,
          executionId,
          stepExecutionId: paused.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
        });
        const failed = await wait(apiClient, executionId, 'failed');
        expect(failed.error?.type).toBe('ServiceAccountExecutionError');
        await expect
          .poll(async () => (await handlerExecutions()).length, { timeout: 30_000 })
          .toBe(2);
        const handler = (await handlerExecutions()).find(
          (execution) => execution.id !== control.id
        );
        expect(handler).toBeDefined();
        expectAccount(await wait(apiClient, String(handler?.id)), otherAccountId);
      }
    );
  }
);
