/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'crypto';
import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  authenticationStep,
  createServiceAccountSuite,
  workflowYaml,
} from '../fixtures/service_account_suite';

apiTest.describe(
  '[NON-MKI] Workflow service accounts: step-test space isolation',
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    apiTest.setTimeout(120_000);
    const { getContext, setup, teardown } = createServiceAccountSuite({
      testWritePermissions: true,
    });
    const sourceSpace = `step-source-${randomUUID()}`;
    const targetSpace = `step-target-${randomUUID()}`;
    const targetWorkflowId = `step-target-${randomUUID()}`;
    const createdSpaces: string[] = [];
    let targetCreated = false;
    let executorHeaders: Record<string, string>;

    const waitForExecution = async (
      apiClient: ApiClientFixture,
      spaceId: string,
      executionId: string,
      status: string,
      headers: Record<string, string>
    ): Promise<WorkflowExecutionDto> => {
      const get = async (): Promise<WorkflowExecutionDto> => {
        const response = await apiClient.get(
          `s/${spaceId}/api/workflows/executions/${executionId}?includeOutput=true`,
          { headers, responseType: 'json' }
        );
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        return response.body;
      };
      await expect.poll(async () => (await get()).status, { timeout: 60_000 }).toBe(status);
      return get();
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient, requestAuth }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const { headers, accountId, dataIndex } = getContext();
      for (const id of [sourceSpace, targetSpace]) {
        const response = await apiClient.post('api/spaces/space', {
          headers,
          body: { id, name: id },
          responseType: 'json',
        });
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        createdSpaces.push(id);
      }
      const executor = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [
          {
            base: [],
            feature: {
              workflowsManagement: ['workflow_read', 'workflow_execution_read', 'workflow_execute'],
            },
            spaces: [sourceSpace],
          },
        ],
      });
      executorHeaders = {
        ...executor.apiKeyHeader,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      };
      const target = await apiClient.post(`s/${targetSpace}/api/workflows/workflow`, {
        headers,
        body: {
          id: targetWorkflowId,
          yaml: workflowYaml(
            accountId,
            `${authenticationStep}  - name: write_marker
    type: elasticsearch.request
    with:
      method: PUT
      path: /${dataIndex}/_doc/space-marker
      body:
        message: Written by the target service account
`
          ),
        },
        responseType: 'json',
      });
      expect(target, JSON.stringify(target.body)).toHaveStatusCode(200);
      targetCreated = true;
    });

    apiTest.afterAll(async ({ apiClient, esClient, config }) => {
      const { headers } = getContext();
      try {
        if (targetCreated) {
          const deleted = await apiClient.delete(
            `s/${targetSpace}/api/workflows/workflow/${targetWorkflowId}?force=true`,
            { headers, responseType: 'json' }
          );
          expect(deleted, JSON.stringify(deleted.body)).toHaveStatusCode(200);
        }
      } finally {
        try {
          for (const id of createdSpaces) {
            const deleted = await apiClient.delete(`api/spaces/space/${id}`, { headers });
            expect(deleted).toHaveStatusCode(204);
          }
        } finally {
          await teardown({ apiClient, esClient, config });
        }
      }
    });

    apiTest(
      'permits an authorized target run but denies direct access from the source space',
      async ({ apiClient, esClient }) => {
        const { headers, accountId, dataIndex, expectAccount } = getContext();
        const path = `s/${targetSpace}/api/workflows/workflow/${targetWorkflowId}/run`;
        const denied = await apiClient.post(path, {
          headers: executorHeaders,
          body: { inputs: {} },
          responseType: 'json',
        });
        expect(denied).toHaveStatusCode(403);
        const allowed = await apiClient.post(path, {
          headers,
          body: { inputs: {} },
          responseType: 'json',
        });
        expect(allowed, JSON.stringify(allowed.body)).toHaveStatusCode(200);
        const execution = await waitForExecution(
          apiClient,
          targetSpace,
          allowed.body.workflowExecutionId,
          'completed',
          headers
        );
        expectAccount(execution, accountId);
        const marker = await esClient.get({ index: dataIndex, id: 'space-marker' });
        expect(marker._source).toStrictEqual({ message: 'Written by the target service account' });
        await esClient.delete({ index: dataIndex, id: 'space-marker', refresh: 'wait_for' });
      }
    );

    for (const stepType of ['workflow.execute', 'workflow.executeAsync']) {
      apiTest(
        `keeps ${stepType} step tests in the request space`,
        async ({ apiClient, esClient }) => {
          const { headers, dataIndex } = getContext();
          const executionsPath = `s/${targetSpace}/api/workflows/workflow/${targetWorkflowId}/executions`;
          const before = await apiClient.get(executionsPath, { headers, responseType: 'json' });
          expect(before).toHaveStatusCode(200);
          const response = await apiClient.post(`s/${sourceSpace}/api/workflows/step/test`, {
            headers: executorHeaders,
            body: {
              workflowYaml: `name: Step-test isolation
enabled: true
triggers:
  - type: manual
steps:
  - name: child
    type: ${stepType}
    with:
      workflow-id: ${targetWorkflowId}
      inputs: {}
`,
              stepId: 'child',
              executionContext: { spaceId: targetSpace },
              contextOverride: {},
            },
            responseType: 'json',
          });
          expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
          const execution = await waitForExecution(
            apiClient,
            sourceSpace,
            response.body.workflowExecutionId,
            'failed',
            executorHeaders
          );
          expect(execution.spaceId).toBe(sourceSpace);
          expect(execution.context?.spaceId).toBe(sourceSpace);
          expect(execution.effectiveIdentity).toBeUndefined();
          const child = execution.stepExecutions?.find((step) => step.stepId === 'child');
          expect(child?.status).toBe('failed');
          expect(child?.error?.message).toContain('Workflow not found');
          const after = await apiClient.get(executionsPath, { headers, responseType: 'json' });
          expect(after).toHaveStatusCode(200);
          expect(after.body.total).toBe(before.body.total);
          expect(await esClient.exists({ index: dataIndex, id: 'space-marker' })).toBe(false);
        }
      );
    }

    apiTest('preserves ordinary step-test inputs and context overrides', async ({ apiClient }) => {
      const response = await apiClient.post(`s/${sourceSpace}/api/workflows/step/test`, {
        headers: executorHeaders,
        body: {
          workflowYaml: `name: Step-test inputs
enabled: true
inputs:
  - name: message
    type: string
consts:
  suffix: original
triggers:
  - type: manual
steps:
  - name: echo
    type: console
    with:
      message: "{{ inputs.message }} {{ consts.suffix }}"
`,
          stepId: 'echo',
          executionContext: { inputs: { message: 'Original input' } },
          contextOverride: { consts: { suffix: 'and override' } },
        },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      const execution = await waitForExecution(
        apiClient,
        sourceSpace,
        response.body.workflowExecutionId,
        'completed',
        executorHeaders
      );
      expect(execution.spaceId).toBe(sourceSpace);
      expect(execution.effectiveIdentity).toBeUndefined();
      const echo = execution.stepExecutions?.find((step) => step.stepId === 'echo');
      expect(echo?.output).toBe('Original input and override');
    });
  }
);
