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

import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: authorization',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    const { getContext, setup, teardown, cleanupWorkflows } = createServiceAccountSuite();
    apiTest.beforeAll(setup);
    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));
    apiTest.afterAll(teardown);
    apiTest(
      'executes with selected read-only roles instead of the creator privileges',
      async ({ apiClient }) => {
        const { readOnlyAccountId, dataIndex, create, run, wait, expectAccount } = getContext();

        const read = await create(
          apiClient,
          workflowYaml(
            readOnlyAccountId,
            `${authenticationStep}  - name: read
    type: elasticsearch.request
    with:
      method: GET
      path: /${dataIndex}/_doc/readable
`
          )
        );
        const readExecution = await wait(apiClient, await run(apiClient, read));
        expectAccount(readExecution, readOnlyAccountId);
        expect(
          JSON.stringify(
            readExecution.stepExecutions?.find((step) => step.stepId === 'read')?.output
          )
        ).toContain('Explicit SA roles permit reading this document');

        const write = await create(
          apiClient,
          workflowYaml(
            readOnlyAccountId,
            `${authenticationStep}  - name: forbidden_write
    type: elasticsearch.request
    with:
      method: PUT
      path: /${dataIndex}/_doc/forbidden
      body:
        message: must not be written
`
          )
        );
        const deniedExecution = await wait(apiClient, await run(apiClient, write), 'failed');
        expectAccount(deniedExecution, readOnlyAccountId);
        const deniedStep = deniedExecution.stepExecutions?.find(
          (step) => step.stepId === 'forbidden_write'
        );
        expect(deniedStep?.status).toBe('failed');
        expect(JSON.stringify(deniedStep?.error)).toContain('security_exception');
      }
    );

    apiTest(
      'runs the saved definition as its bound account and rejects modified test YAML',
      async ({ apiClient }) => {
        const { headers, accountId, create, run, wait, expectAccount } = getContext();

        const yaml = workflowYaml(accountId);
        const id = await create(apiClient, yaml);
        expectAccount(await wait(apiClient, await run(apiClient, id)), accountId);
        const savedTest = await apiClient.post('api/workflows/test', {
          headers,
          body: { workflowId: id, inputs: {} },
          responseType: 'json',
        });
        expect(savedTest, JSON.stringify(savedTest.body)).toHaveStatusCode(200);
        expectAccount(await wait(apiClient, savedTest.body.workflowExecutionId), accountId);
        const changedTest = await apiClient.post('api/workflows/test', {
          headers,
          body: {
            workflowId: id,
            workflowYaml: yaml.replace('identity proof', 'modified draft'),
            inputs: {},
          },
          responseType: 'json',
        });
        expect(changedTest, JSON.stringify(changedTest.body)).toHaveStatusCode(400);
        const inlineTest = await apiClient.post('api/workflows/test', {
          headers,
          body: { workflowYaml: yaml, inputs: {} },
          responseType: 'json',
        });
        expect(inlineTest, JSON.stringify(inlineTest.body)).toHaveStatusCode(400);
      }
    );

    apiTest(
      'rejects service-account step tests even with unchanged saved YAML',
      async ({ apiClient }) => {
        const { headers, accountId, create, wait } = getContext();

        const yaml = workflowYaml(accountId, waitStep + authenticationStep);
        const id = await create(apiClient, yaml);
        const executionsPath = `api/workflows/workflow/${id}/executions`;
        const before = await apiClient.get(executionsPath, { headers, responseType: 'json' });
        expect(before).toHaveStatusCode(200);
        const stepTest = await apiClient.post('api/workflows/step/test', {
          headers,
          body: {
            workflowId: id,
            workflowYaml: yaml,
            stepId: 'authenticate',
            executionContext: { resumeInput: { approved: true } },
            contextOverride: {},
          },
          responseType: 'json',
        });
        expect(stepTest, JSON.stringify(stepTest.body)).toHaveStatusCode(400);
        expect(stepTest.body.message).toContain('bypass the saved workflow control flow');
        const after = await apiClient.get(executionsPath, { headers, responseType: 'json' });
        expect(after).toHaveStatusCode(200);
        expect(after.body.total).toBe(before.body.total);

        const ordinaryYaml = yaml.replace(`settings:\n  run_as: ${accountId}\n`, '');
        const ordinaryId = await create(apiClient, ordinaryYaml);
        const ordinaryTest = await apiClient.post('api/workflows/step/test', {
          headers,
          body: {
            workflowId: ordinaryId,
            workflowYaml: ordinaryYaml,
            stepId: 'authenticate',
            contextOverride: {},
          },
          responseType: 'json',
        });
        expect(ordinaryTest, JSON.stringify(ordinaryTest.body)).toHaveStatusCode(200);
        const execution = await wait(apiClient, ordinaryTest.body.workflowExecutionId);
        expect(execution.status).toBe('completed');
        expect(execution.effectiveIdentity).toBeUndefined();
      }
    );

    apiTest(
      'allows an executor to run but prevents definition edits without manage_security',
      async ({ apiClient, samlAuth }) => {
        const { headers, accountId, workflowIds, create, run, wait, expectAccount } = getContext();

        const id = await create(apiClient, workflowYaml(accountId));
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
        const edit = await apiClient.put(`api/workflows/workflow/${id}`, {
          headers: executorHeaders,
          body: { yaml: workflowYaml(accountId).replace('identity proof', 'changed definition') },
          responseType: 'json',
        });
        expect(edit, JSON.stringify(edit.body)).toHaveStatusCode(403);
        const deletion = await apiClient.delete(`api/workflows/workflow/${id}?force=true`, {
          headers: executorHeaders,
          responseType: 'json',
        });
        expect(deletion, JSON.stringify(deletion.body)).toHaveStatusCode(403);
        const existing = await apiClient.get(`api/workflows/workflow/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(existing).toHaveStatusCode(200);
        const ordinaryId = await create(
          apiClient,
          workflowYaml(accountId).replace(`settings:\n  run_as: ${accountId}\n`, '')
        );
        const mixedDelete = await apiClient.delete('api/workflows?force=true', {
          headers: executorHeaders,
          body: { ids: [id, ordinaryId] },
          responseType: 'json',
        });
        expect(mixedDelete, JSON.stringify(mixedDelete.body)).toHaveStatusCode(200);
        expect(mixedDelete.body.deleted).toBe(1);
        expect(mixedDelete.body.failures).toStrictEqual([
          { id, error: expect.stringContaining('manage_security') },
        ]);
        const ordinary = await apiClient.get(`api/workflows/workflow/${ordinaryId}`, {
          headers,
          responseType: 'json',
        });
        expect(ordinary).toHaveStatusCode(404);
        workflowIds.delete(ordinaryId);
        expectAccount(
          await wait(apiClient, await run(apiClient, id, executorHeaders)),
          accountId,
          executor.body
        );
      }
    );
  }
);
