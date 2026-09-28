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
  '[NON-MKI] Workflow service accounts: nested',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    for (const boundChild of [false, true]) {
      apiTest(
        `SA continuation audit: ${
          boundChild ? 'bound' : 'unbound'
        } child approval does not change parent identity`,
        async ({ apiClient, samlAuth }) => {
          const { headers, accountId, otherAccountId, create, run, wait, expectAccount } =
            getContext();

          apiTest.setTimeout(180_000);
          const { cookieHeader } = await samlAuth.asInteractiveUser({
            elasticsearch: { cluster: [], indices: [] },
            kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
          });
          const approverHeaders = { ...headers, ...cookieHeader };
          const childYaml = workflowYaml(otherAccountId, waitStep + authenticationStep);
          const childId = await create(
            apiClient,
            boundChild
              ? childYaml
              : childYaml.replace(`settings:\n  run_as: ${otherAccountId}\n`, '')
          );
          const parentId = await create(
            apiClient,
            workflowYaml(
              accountId,
              `  - name: child
    type: workflow.execute
    with:
      workflow-id: ${childId}
      inputs: {}
${authenticationStep}`
            )
          );
          const parentExecutionId = await run(apiClient, parentId);
          const parent = await wait(apiClient, parentExecutionId, 'waiting_for_child');
          const childExecutionId = parent.stepExecutions?.find((step) => step.stepId === 'child')
            ?.state?.executionId;
          expect(typeof childExecutionId).toBe('string');
          const child = await wait(apiClient, String(childExecutionId), 'waiting_for_input');
          const approved = await apiClient.post(`api/workflows/executions/${child.id}/resume`, {
            headers: approverHeaders,
            body: {
              input: { approved: true },
              stepExecutionId: child.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
            },
            responseType: 'json',
          });
          expect(approved, JSON.stringify(approved.body)).toHaveStatusCode(200);
          const completedChild = await wait(apiClient, child.id);
          expect(completedChild.effectiveIdentity).toStrictEqual(
            boundChild ? { type: 'service_account', id: otherAccountId } : undefined
          );
          const output = JSON.stringify(
            completedChild.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
          );
          expect(output).not.toContain(accountId);
          expect(output.includes(otherAccountId)).toBe(boundChild);
          expectAccount(await wait(apiClient, parentExecutionId), accountId);
        }
      );
    }

    apiTest('a nested child selects its own account', async ({ apiClient }) => {
      const { headers, accountId, otherAccountId, create, run, wait, expectAccount } = getContext();

      apiTest.setTimeout(120_000);
      const childId = await create(apiClient, workflowYaml(otherAccountId));
      const parentId = await create(
        apiClient,
        workflowYaml(
          accountId,
          `  - name: child
    type: workflow.execute
    with:
      workflow-id: ${childId}
      inputs: {}
${authenticationStep}`
        )
      );
      const parent = await wait(apiClient, await run(apiClient, parentId));
      expectAccount(parent, accountId);
      const response = await apiClient.get(`api/workflows/workflow/${childId}/executions`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      const childExecution = response.body.results[0] as WorkflowExecutionDto;
      expectAccount(await wait(apiClient, childExecution.id), otherAccountId);
    });
  }
);
