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
import type { ApiClientFixture, EsClient, SamlAuth, ScoutTestConfig } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { cleanupEsServiceAccounts } from './cleanup_es_service_accounts';

export const authenticationStep = `  - name: authenticate
    type: elasticsearch.request
    with:
      method: GET
      path: /_security/_authenticate
`;
export const waitStep = `  - name: approval
    type: waitForInput
    with:
      message: Approve local test
      schema:
        type: object
        properties:
          approved:
            type: boolean
`;
export const workflowYaml = (
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

/** Builds isolated account and workflow fixtures for one execution-flow suite. */
export const createServiceAccountSuite = () => {
  let headers: Record<string, string>;

  let accountId: string;

  let initiatingUser: Pick<AuthenticatedUser, 'username' | 'profile_uid'>;

  let otherAccountId: string;

  let readOnlyAccountId: string;

  const dataIndex = `cp2-sa-permissions-${Date.now()}`;

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
    expect(execution.stepExecutions?.some((step) => step.stepId === 'authenticate') ?? false).toBe(
      false
    );
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

  const setup = async ({
    apiClient,
    samlAuth,
    config,
    esClient,
  }: {
    apiClient: ApiClientFixture;
    samlAuth: SamlAuth;
    config: ScoutTestConfig;
    esClient: EsClient;
  }): Promise<void> => {
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
  };

  const cleanupWorkflows = async (apiClient: ApiClientFixture): Promise<void> => {
    const failures: Error[] = [];
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
      } catch (error) {
        failures.push(new Error(`Failed to clean workflow ${id}`, { cause: error }));
      }
    }
    if (failures.length) throw new AggregateError(failures, 'Workflow cleanup failed');
  };

  const teardown = async ({
    apiClient,
    esClient,
    config,
  }: {
    apiClient: ApiClientFixture;
    esClient: EsClient;
    config: ScoutTestConfig;
  }): Promise<void> => {
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
        failures.push(new Error('Elasticsearch service account cleanup failed', { cause: error }));
      }
    }
    try {
      await esClient.indices.delete({ index: dataIndex }, { ignore: [404] });
    } catch (error) {
      failures.push(new Error('Permission fixture cleanup failed', { cause: error }));
    }
    if (failures.length) throw new AggregateError(failures, 'Service-account suite cleanup failed');
  };

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

  const resume = async (apiClient: ApiClientFixture, paused: Awaited<ReturnType<typeof pause>>) => {
    const response = await apiClient.post(`api/workflows/executions/${paused.executionId}/resume`, {
      headers,
      body: { input: { approved: true }, stepExecutionId: paused.stepExecutionId },
      responseType: 'json',
    });
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
  return {
    setup,
    teardown,
    cleanupWorkflows,
    getContext: () => ({
      headers,
      accountId,
      initiatingUser,
      otherAccountId,
      readOnlyAccountId,
      dataIndex,
      workflowIds,
      create,
      updateYaml,
      expectIdentityFailure,
      run,
      wait,
      expectAccount,
      cleanupWorkflows,
      pause,
      resume,
      expectPausedExecutionSearchable,
    }),
  };
};
