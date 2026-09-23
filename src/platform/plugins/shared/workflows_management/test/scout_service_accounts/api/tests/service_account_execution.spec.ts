/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent, fetch } from 'undici';
import {
  generateCosmosDBApiRequestHeaders,
  MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_ORGANIZATION_SERVICE_ACCOUNTS,
  MOCK_IDP_UIAM_COSMOS_DB_NAME,
  MOCK_IDP_UIAM_COSMOS_DB_URL,
  MOCK_IDP_UIAM_ORG_ADMIN_API_KEY,
} from '@kbn/mock-idp-utils';
import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';

const authenticationStep = `  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`;
const waitStep = `  - name: approval
    type: waitForInput
    with:
      message: Approve local test
      schema:
        type: object
        properties:
          approved:
            type: boolean
`;
const workflowYaml = (
  accountId: string,
  steps = authenticationStep
): string => `name: CP2 identity proof
enabled: true
settings:
  run_as: ${accountId}
triggers:
  - type: manual
steps:
${steps}`;

apiTest.describe(
  '[NON-MKI] Saved workflow service account execution',
  { tag: ['@local-serverless-search'] },
  () => {
    let headers: Record<string, string>;
    let accountId: string;
    let otherAccountId: string;
    const workflowIds = new Set<string>();
    const accountIds = new Set<string>();

    const create = async (apiClient: ApiClientFixture, yaml: string): Promise<string> => {
      const id = `cp2-${Date.now()}-${workflowIds.size}`;
      const response = await apiClient.post('api/workflows/workflow', {
        headers,
        body: { id, yaml },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      workflowIds.add(id);
      return id;
    };
    const run = async (
      apiClient: ApiClientFixture,
      id: string,
      requestHeaders = headers
    ): Promise<string> => {
      const response = await apiClient.post(`api/workflows/workflow/${id}/run`, {
        headers: requestHeaders,
        body: { inputs: {} },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      return response.body.workflowExecutionId as string;
    };
    const wait = async (
      apiClient: ApiClientFixture,
      id: string,
      status = 'completed'
    ): Promise<WorkflowExecutionDto> => {
      const get = async () => {
        const response = await apiClient.get(`api/workflows/executions/${id}?includeOutput=true`, {
          headers,
          responseType: 'json',
        });
        expect(response).toHaveStatusCode(200);
        return response.body as WorkflowExecutionDto;
      };
      await expect
        .poll(
          async () => {
            const execution = await get();
            if (execution.status === 'failed' && status !== 'failed')
              throw new Error(JSON.stringify(execution.error));
            return execution.status;
          },
          { timeout: 60_000 }
        )
        .toBe(status);
      return get();
    };
    const expectAccount = (execution: WorkflowExecutionDto, id: string) => {
      expect(execution.effectiveIdentity).toStrictEqual({ type: 'service_account', id });
      expect(
        JSON.stringify(
          execution.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
        )
      ).toContain(id);
      expect(typeof execution.executedBy).toBe('string');
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = {
        ...cookieHeader,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      };
      const accounts: string[] = [];
      for (const name of ['primary', 'child']) {
        const response = await apiClient.post('internal/security/service_account', {
          headers: {
            'kbn-xsrf': 'true',
            'x-elastic-internal-origin': 'kibana',
            Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
          },
          body: { name: `cp2-${name}-${Date.now()}` },
          responseType: 'json',
        });
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        accountIds.add(response.body.id as string);
        accounts.push(response.body.id as string);
      }
      [accountId, otherAccountId] = accounts;
    });

    const cleanupWorkflows = async (apiClient: ApiClientFixture): Promise<void> => {
      for (const id of workflowIds) {
        const disabled = await apiClient.put(`api/workflows/workflow/${id}`, {
          headers,
          body: { enabled: false },
          responseType: 'json',
        });
        expect(disabled, JSON.stringify(disabled.body)).toHaveStatusCode(200);
        const cancelled = await apiClient.post(`api/workflows/workflow/${id}/executions/cancel`, {
          headers,
          responseType: 'json',
        });
        expect(cancelled, JSON.stringify(cancelled.body)).toHaveStatusCode(200);
        const query = new URLSearchParams(
          NonTerminalExecutionStatuses.map((status) => ['statuses', status])
        );
        await expect
          .poll(
            async () => {
              const active = await apiClient.get(
                `api/workflows/workflow/${id}/executions?${query}`,
                { headers, responseType: 'json' }
              );
              expect(active).toHaveStatusCode(200);
              return active.body.results.map((execution: WorkflowExecutionDto) => ({
                id: execution.id,
                status: execution.status,
              }));
            },
            { timeout: 30_000 }
          )
          .toStrictEqual([]);
        const response = await apiClient.delete('api/workflows?force=true', {
          headers,
          body: { ids: [id] },
          responseType: 'json',
        });
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        expect(response.body.failures).toStrictEqual([]);
        expect(response.body.deleted).toBe(1);
        const remaining = await apiClient.get(`api/workflows/workflow/${id}`, {
          headers,
          responseType: 'json',
        });
        expect(remaining).toHaveStatusCode(404);
        workflowIds.delete(id);
      }
    };

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(async () => {
      // Remove only this suite's disposable Cosmos fixtures; project-account revocation
      // is not authorized by the seeded organization API key in the local UIAM image.
      const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
      try {
        for (const id of accountIds) {
          const resource = `dbs/${MOCK_IDP_UIAM_COSMOS_DB_NAME}/colls/${MOCK_IDP_UIAM_COSMOS_DB_COLLECTION_ORGANIZATION_SERVICE_ACCOUNTS}/docs/${id}`;
          const response = await fetch(`${MOCK_IDP_UIAM_COSMOS_DB_URL}/${resource}`, {
            method: 'DELETE',
            dispatcher,
            headers: {
              ...generateCosmosDBApiRequestHeaders('DELETE', 'docs', resource),
              'x-ms-documentdb-partitionkey': JSON.stringify([id]),
            },
          });
          expect(response.status, await response.text()).toBe(204);
          accountIds.delete(id);
        }
      } finally {
        await dispatcher.close();
      }
    });

    apiTest(
      'runs the saved definition as its bound account and rejects modified test YAML',
      async ({ apiClient }) => {
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
        expect(stepTest.body.message).toContain('individual step tests');
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
        const id = await create(apiClient, workflowYaml(accountId));
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
        });
        const executorHeaders = { ...headers, ...cookieHeader };
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
        expectAccount(await wait(apiClient, await run(apiClient, id, executorHeaders)), accountId);
      }
    );

    const pause = async (apiClient: ApiClientFixture) => {
      const yaml = workflowYaml(accountId, waitStep + authenticationStep);
      const id = await create(apiClient, yaml);
      const executionId = await run(apiClient, id);
      const paused = await wait(apiClient, executionId, 'waiting_for_input');
      return {
        id,
        yaml,
        executionId,
        stepExecutionId: paused.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
      };
    };
    const resume = async (
      apiClient: ApiClientFixture,
      paused: Awaited<ReturnType<typeof pause>>
    ) => {
      const response = await apiClient.post(
        `api/workflows/executions/${paused.executionId}/resume`,
        {
          headers,
          body: { input: { approved: true }, stepExecutionId: paused.stepExecutionId },
          responseType: 'json',
        }
      );
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
    };

    const expectPausedExecutionSearchable = async (
      apiClient: ApiClientFixture,
      id: string,
      executionId: string
    ): Promise<void> => {
      await expect
        .poll(
          async () => {
            const executions = await apiClient.get(
              `api/workflows/workflow/${id}/executions?statuses=waiting_for_input`,
              { headers, responseType: 'json' }
            );
            expect(executions).toHaveStatusCode(200);
            return executions.body.results.some(
              (execution: WorkflowExecutionDto) => execution.id === executionId
            );
          },
          { timeout: 15_000 }
        )
        .toBe(true);
    };

    const discardPausedFixture = async (apiClient: ApiClientFixture, id: string): Promise<void> => {
      if (!workflowIds.has(id)) return;
      // Soft deletion supports active executions and releases bindings without waiting for resume.
      const response = await apiClient.delete('api/workflows', {
        headers,
        body: { ids: [id] },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      expect(response.body.failures).toStrictEqual([]);
      expect(response.body.deleted).toBe(1);
      const remaining = await apiClient.get(`api/workflows/workflow/${id}`, {
        headers,
        responseType: 'json',
      });
      expect(remaining).toHaveStatusCode(404);
      workflowIds.delete(id);
    };

    for (const bound of [false, true]) {
      apiTest(
        `returns conflict when force-deleting ${
          bound ? 'a bound' : 'an unbound'
        } workflow with a paused execution`,
        async ({ apiClient }) => {
          apiTest.setTimeout(180_000);
          const yaml = workflowYaml(accountId, waitStep + authenticationStep);
          const id = await create(
            apiClient,
            bound ? yaml : yaml.replace(`settings:\n  run_as: ${accountId}\n`, '')
          );
          const executionId = await run(apiClient, id);
          try {
            await wait(apiClient, executionId, 'waiting_for_input');
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
            await cleanupWorkflows(apiClient);
          } finally {
            await discardPausedFixture(apiClient, id);
          }
        }
      );
    }

    apiTest('cleanup removes a workflow left paused for input', async ({ apiClient }) => {
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
        await discardPausedFixture(apiClient, paused.id);
      }
    });

    apiTest('resumes with the original service account', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);
      const paused = await pause(apiClient);
      await resume(apiClient, paused);
      expectAccount(await wait(apiClient, paused.executionId), accountId);
    });

    apiTest('fails resume after rebind without executing the next step', async ({ apiClient }) => {
      apiTest.setTimeout(120_000);
      const paused = await pause(apiClient);
      const update = await apiClient.put(`api/workflows/workflow/${paused.id}`, {
        headers,
        body: { yaml: paused.yaml.replace(accountId, otherAccountId) },
        responseType: 'json',
      });
      expect(update, JSON.stringify(update.body)).toHaveStatusCode(200);
      await resume(apiClient, paused);
      const execution = await wait(apiClient, paused.executionId, 'failed');
      expect(execution.error?.message).toContain('expected service account');
      expect(typeof execution.finishedAt).toBe('string');
      const approval = execution.stepExecutions?.find((step) => step.stepId === 'approval');
      expect(approval?.status).toBe('failed');
      expect(typeof approval?.finishedAt).toBe('string');
      expect(approval?.error?.type).toBe('ServiceAccountExecutionError');
      expect(
        execution.stepExecutions?.some(
          (step) => step.stepId === 'authenticate' && step.status === 'completed'
        )
      ).toBe(false);
    });

    apiTest('scheduled execution uses its service account', async ({ apiClient }) => {
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

    apiTest(
      'clone and bulk import create independent bindings, and overwrite can unbind',
      async ({ apiClient }) => {
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

    apiTest('a nested child selects its own account', async ({ apiClient }) => {
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
