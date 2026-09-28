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

const readStep = (index: string, name = 'read') => `  - name: ${name}
    type: elasticsearch.request
    with:
      method: GET
      path: /${index}/_doc/readable
`;
const writeStep = (index: string, id: string) => `  - name: write
    type: elasticsearch.request
    with:
      method: PUT
      path: /${index}/_doc/${id}
      body:
        message: write probe
`;
const expectReadOnlyFailure = (execution: WorkflowExecutionDto, accountId: string) => {
  expect(execution.effectiveIdentity).toStrictEqual({ type: 'service_account', id: accountId });
  expect(execution.stepExecutions?.find((step) => step.stepId === 'read')?.status).toBe(
    'completed'
  );
  const write = execution.stepExecutions?.find((step) => step.stepId === 'write');
  expect(write?.status).toBe('failed');
  expect(JSON.stringify(write?.error)).toContain('security_exception');
};

apiTest.describe(
  '[NON-MKI] Workflow service accounts: permission boundaries',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite({
      testWritePermissions: true,
    });
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);

    apiTest(
      'retains read-only permissions after approval by an administrator',
      async ({ apiClient, requestAuth, esClient }) => {
        apiTest.setTimeout(120_000);
        const { readOnlyAccountId, dataIndex, create, run, wait, resume } = getContext();
        const admin = await requestAuth.getApiKey('admin');
        const requestHeaders = {
          ...admin.apiKeyHeader,
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        };
        const yaml = workflowYaml(
          readOnlyAccountId,
          readStep(dataIndex, 'before_approval') +
            waitStep +
            authenticationStep +
            readStep(dataIndex) +
            writeStep(dataIndex, 'forbidden-resume')
        );
        const id = await create(apiClient, yaml, requestHeaders);
        const executionId = await run(apiClient, id, requestHeaders);
        const paused = await wait(apiClient, executionId, 'waiting_for_input', requestHeaders);
        expect(
          paused.stepExecutions?.find((step) => step.stepId === 'before_approval')?.status
        ).toBe('completed');
        await resume(
          apiClient,
          {
            id,
            yaml,
            executionId,
            stepExecutionId: paused.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          },
          requestHeaders
        );
        const execution = await wait(apiClient, executionId, 'failed', requestHeaders);
        expectReadOnlyFailure(execution, readOnlyAccountId);
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-resume' })).toBe(false);
      }
    );

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

    apiTest(
      'a read-only child cannot inherit its parent write permissions',
      async ({ apiClient, requestAuth, esClient }) => {
        apiTest.setTimeout(150_000);
        const { accountId, readOnlyAccountId, dataIndex, create, run, wait, resume } = getContext();
        const admin = await requestAuth.getApiKey('admin');
        const headers = {
          ...admin.apiKeyHeader,
          'kbn-xsrf': 'true',
          'elastic-api-version': '2023-10-31',
          'x-elastic-internal-origin': 'kibana',
        };
        const childYaml = workflowYaml(
          readOnlyAccountId,
          `${
            waitStep +
            authenticationStep +
            readStep(dataIndex) +
            writeStep(dataIndex, 'forbidden-child')
          }    on-failure:\n      continue: true\n`
        );
        const childId = await create(apiClient, childYaml, headers);
        const parentId = await create(
          apiClient,
          workflowYaml(
            accountId,
            `${writeStep(dataIndex, 'allowed-parent')}  - name: child
    type: workflow.execute
    with:
      workflow-id: ${childId}
      inputs: {}
${authenticationStep}`
          ),
          headers
        );
        const parentExecutionId = await run(apiClient, parentId, headers);
        const parent = await wait(apiClient, parentExecutionId, 'waiting_for_child', headers);
        expect(parent.stepExecutions?.find((step) => step.stepId === 'write')?.status).toBe(
          'completed'
        );
        const childExecutionId = parent.stepExecutions?.find((step) => step.stepId === 'child')
          ?.state?.executionId;
        expect(typeof childExecutionId).toBe('string');
        const child = await wait(apiClient, String(childExecutionId), 'waiting_for_input', headers);
        await resume(
          apiClient,
          {
            id: childId,
            yaml: childYaml,
            executionId: child.id,
            stepExecutionId: child.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          },
          headers
        );
        expectReadOnlyFailure(
          await wait(apiClient, child.id, 'completed', headers),
          readOnlyAccountId
        );
        const completedParent = await wait(apiClient, parentExecutionId, 'completed', headers);
        expect(completedParent.effectiveIdentity).toStrictEqual({
          type: 'service_account',
          id: accountId,
        });
        expect(
          JSON.stringify(
            completedParent.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
          )
        ).toContain(accountId);
        expect(await esClient.exists({ index: dataIndex, id: 'allowed-parent' })).toBe(true);
        expect(await esClient.exists({ index: dataIndex, id: 'forbidden-child' })).toBe(false);
      }
    );
  }
);
