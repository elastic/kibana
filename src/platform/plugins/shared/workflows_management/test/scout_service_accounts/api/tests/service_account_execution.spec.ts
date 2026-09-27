/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Agent, fetch } from 'undici';
import type { AuthenticatedUser } from '@kbn/core-security-common';
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
import { cleanupEsServiceAccounts } from '../fixtures/cleanup_es_service_accounts';

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
  { tag: ['@local-serverless-search', '@local-stateful-classic'] },
  () => {
    let headers: Record<string, string>;
    let accountId: string;
    let initiatingUser: Pick<AuthenticatedUser, 'username' | 'profile_uid'>;
    let otherAccountId: string;
    let readOnlyAccountId: string;
    const dataIndex = `cp2-sa-permissions-${Date.now()}`;
    const workflowIds = new Set<string>();
    const managedIds = new Set<string>();
    const managedPath = (id: string) =>
      `internal/workflows_extensions_example/managed_service_account/${id}`;
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
    const updateYaml = async (
      apiClient: ApiClientFixture,
      id: string,
      yaml: string
    ): Promise<void> => {
      const response = await apiClient.put(`api/workflows/workflow/${id}`, {
        headers,
        body: { yaml },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
    };
    const expectIdentityFailure = (execution: WorkflowExecutionDto): void => {
      expect(execution.error?.type).toBe('ServiceAccountExecutionError');
      expect(
        execution.stepExecutions?.some((step) => step.stepId === 'authenticate') ?? false
      ).toBe(false);
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
    const expectAccount = (
      execution: WorkflowExecutionDto,
      id: string,
      expectedUser = initiatingUser
    ) => {
      expect(execution.effectiveIdentity).toStrictEqual({ type: 'service_account', id });
      expect(
        JSON.stringify(
          execution.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output
        )
      ).toContain(id);
      expect([expectedUser.username, expectedUser.profile_uid].filter(Boolean)).toContain(
        execution.executedBy
      );
    };

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      headers = {
        ...cookieHeader,
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      };
      const user = await apiClient.get('internal/security/me', { headers, responseType: 'json' });
      expect(user).toHaveStatusCode(200);
      initiatingUser = user.body;
      expect(typeof initiatingUser.username).toBe('string');
      expect(initiatingUser.username).not.toBe('');
      const accounts: string[] = [];
      for (const name of ['primary', 'child', 'read-only']) {
        const response = await apiClient.post('internal/security/service_account', {
          headers: config.serverless
            ? {
                'kbn-xsrf': 'true',
                'x-elastic-internal-origin': 'kibana',
                Authorization: `ApiKey ${MOCK_IDP_UIAM_ORG_ADMIN_API_KEY}`,
              }
            : headers,
          body: {
            name: `cp2-${name}-${Date.now()}`,
            roles: [name === 'read-only' ? 'viewer' : config.serverless ? 'admin' : 'superuser'],
          },
          responseType: 'json',
        });
        expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
        accountIds.add(response.body.id as string);
        accounts.push(response.body.id as string);
      }
      [accountId, otherAccountId, readOnlyAccountId] = accounts;
      await esClient.index({
        index: dataIndex,
        id: 'readable',
        document: { message: 'Explicit SA roles permit reading this document' },
        refresh: 'wait_for',
      });
    });

    const cleanupWorkflows = async (apiClient: ApiClientFixture): Promise<void> => {
      const failures: Error[] = [];
      for (const id of managedIds) {
        try {
          const workflowId = `system-example-service-account-${id}`;
          const existing = await apiClient.get(`api/workflows/workflow/${workflowId}`, {
            headers,
            responseType: 'json',
          });
          if (existing.statusCode === 404) {
            managedIds.delete(id);
          } else {
            expect(existing).toHaveStatusCode(200);
            const cancelled = await apiClient.post(
              `api/workflows/workflow/${workflowId}/executions/cancel`,
              { headers, responseType: 'json' }
            );
            expect(cancelled, JSON.stringify(cancelled.body)).toHaveStatusCode(200);
            const query = new URLSearchParams(
              NonTerminalExecutionStatuses.map((status) => ['statuses', status])
            );
            await expect
              .poll(
                async () => {
                  const active = await apiClient.get(
                    `api/workflows/workflow/${workflowId}/executions?${query}`,
                    { headers, responseType: 'json' }
                  );
                  expect(active).toHaveStatusCode(200);
                  return active.body.total;
                },
                { timeout: 30_000 }
              )
              .toBe(0);
            const deleted = await apiClient.delete(managedPath(id), {
              headers,
              responseType: 'json',
            });
            expect(deleted, JSON.stringify(deleted.body)).toHaveStatusCode(204);
            const remaining = await apiClient.get(
              `api/workflows/workflow/system-example-service-account-${id}`,
              { headers, responseType: 'json' }
            );
            expect(remaining).toHaveStatusCode(404);
            managedIds.delete(id);
          }
        } catch (error) {
          failures.push(new Error(`Failed to clean managed workflow ${id}`, { cause: error }));
        }
      }
      for (const id of workflowIds) {
        try {
          const disabled = await apiClient.put(`api/workflows/workflow/${id}`, {
            headers,
            body: { enabled: false },
            responseType: 'json',
          });
          if (disabled.statusCode === 404) {
            workflowIds.delete(id);
          } else {
            expect(disabled, JSON.stringify(disabled.body)).toHaveStatusCode(200);
            const cancelled = await apiClient.post(
              `api/workflows/workflow/${id}/executions/cancel`,
              {
                headers,
                responseType: 'json',
              }
            );
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
        } catch (error) {
          failures.push(new Error(`Failed to clean workflow ${id}`, { cause: error }));
        }
      }
      if (failures.length) throw new AggregateError(failures, 'Workflow cleanup failed');
    };

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(async ({ apiClient, esClient, config }) => {
      const failures: Error[] = [];
      try {
        await cleanupWorkflows(apiClient);
      } catch (error) {
        failures.push(new Error('Final workflow cleanup failed', { cause: error }));
      }
      if (config.serverless) {
        // Remove only this suite's disposable Cosmos fixtures; project-account revocation
        // is not authorized by the seeded organization API key in the local UIAM image.
        const dispatcher = new Agent({ connect: { rejectUnauthorized: false } });
        try {
          for (const id of accountIds) {
            try {
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
            } catch (error) {
              failures.push(new Error(`Failed to clean service account ${id}`, { cause: error }));
            }
          }
        } finally {
          await dispatcher.close();
        }
      } else {
        try {
          await cleanupEsServiceAccounts(esClient, config, [...accountIds]);
        } catch (error) {
          failures.push(
            new Error('Elasticsearch service account cleanup failed', { cause: error })
          );
        }
      }
      try {
        await esClient.indices.delete({ index: dataIndex }, { ignore: [404] });
      } catch (error) {
        failures.push(new Error('Permission fixture cleanup failed', { cause: error }));
      }
      if (failures.length)
        throw new AggregateError(failures, 'Service-account suite cleanup failed');
    });

    apiTest(
      'executes with selected read-only roles instead of the creator privileges',
      async ({ apiClient }) => {
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
      'managed workflow installs, executes and rebinds with its service account',
      async ({ apiClient }) => {
        const id = `cp2-${Date.now()}`;
        managedIds.add(id);
        for (const serviceAccountId of [accountId, otherAccountId]) {
          const installed = await apiClient.post(managedPath(id), {
            headers,
            body: { serviceAccountId },
            responseType: 'json',
          });
          expect(installed, JSON.stringify(installed.body)).toHaveStatusCode(200);
          const saved = await apiClient.get(`api/workflows/workflow/${installed.body.workflowId}`, {
            headers,
            responseType: 'json',
          });
          expect(saved, JSON.stringify(saved.body)).toHaveStatusCode(200);
          expect(saved.body).toMatchObject({
            managed: true,
            managedBy: 'workflowsExtensionsExample',
            definition: { settings: { run_as: serviceAccountId } },
          });
          const executed = await apiClient.post(`${managedPath(id)}/run`, {
            headers,
            body: {},
            responseType: 'json',
          });
          expect(executed, JSON.stringify(executed.body)).toHaveStatusCode(200);
          expectAccount(await wait(apiClient, executed.body.workflowExecutionId), serviceAccountId);
        }
      }
    );

    apiTest(
      'managed workflow allows execution but rejects SA mutations without manage_security',
      async ({ apiClient, samlAuth }) => {
        const id = `cp2-${Date.now()}`;
        managedIds.add(id);
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
        const deniedInstall = await apiClient.post(managedPath(id), {
          headers: executorHeaders,
          body: { serviceAccountId: accountId },
          responseType: 'json',
        });
        expect(deniedInstall, JSON.stringify(deniedInstall.body)).toHaveStatusCode(403);
        const installed = await apiClient.post(managedPath(id), {
          headers,
          body: { serviceAccountId: accountId },
          responseType: 'json',
        });
        expect(installed, JSON.stringify(installed.body)).toHaveStatusCode(200);
        const deniedRebind = await apiClient.post(managedPath(id), {
          headers: executorHeaders,
          body: { serviceAccountId: otherAccountId },
          responseType: 'json',
        });
        expect(deniedRebind, JSON.stringify(deniedRebind.body)).toHaveStatusCode(403);
        const deniedDelete = await apiClient.delete(managedPath(id), {
          headers: executorHeaders,
          responseType: 'json',
        });
        expect(deniedDelete, JSON.stringify(deniedDelete.body)).toHaveStatusCode(403);
        const executed = await apiClient.post(`${managedPath(id)}/run`, {
          headers: executorHeaders,
          body: {},
          responseType: 'json',
        });
        expect(executed, JSON.stringify(executed.body)).toHaveStatusCode(200);
        expectAccount(
          await wait(apiClient, executed.body.workflowExecutionId),
          accountId,
          executor.body
        );
      }
    );

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

    for (const continuation of ['timer', 'retry'] as const) {
      apiTest(
        `SA continuation audit: ${continuation} retains the bound identity`,
        async ({ apiClient }) => {
          apiTest.setTimeout(120_000);
          const delayedStep =
            continuation === 'timer'
              ? `  - name: delay
    type: wait
    with:
      duration: 8s
`
              : `  - name: expected_failure
    type: elasticsearch.request
    with:
      method: GET
      path: /cp2-nonexistent-${Date.now()}/_doc/missing
    on-failure:
      retry:
        max-attempts: 1
        delay: 8s
      continue: true
`;
          const id = await create(
            apiClient,
            workflowYaml(accountId, delayedStep + authenticationStep)
          );
          const executionId = await run(apiClient, id);
          await wait(apiClient, executionId, 'waiting');
          expectAccount(await wait(apiClient, executionId), accountId);
        }
      );
    }

    for (const rebind of [false, true]) {
      apiTest(
        `SA continuation audit: queued execution ${
          rebind ? 'rejects a changed binding' : 'retains its identity on promotion'
        }`,
        async ({ apiClient }) => {
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

    for (const boundChild of [false, true]) {
      apiTest(
        `SA continuation audit: ${
          boundChild ? 'bound' : 'unbound'
        } child approval does not change parent identity`,
        async ({ apiClient, samlAuth }) => {
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

    apiTest(
      'SA continuation audit: binding failure dispatches the failure handler',
      async ({ apiClient }) => {
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
