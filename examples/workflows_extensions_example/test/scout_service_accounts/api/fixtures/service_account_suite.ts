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
import type { ApiClientFixture, SamlAuth, ScoutTestConfig, EsClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { cleanupEsServiceAccounts } from './cleanup_es_service_accounts';

/** Builds isolated accounts and managed workflows for the example route tests. */
export const createServiceAccountSuite = () => {
  let headers: Record<string, string>;

  let accountId: string;

  let initiatingUser: Pick<AuthenticatedUser, 'username' | 'profile_uid'>;

  let otherAccountId: string;

  const managedIds = new Set<string>();

  const managedPath = (id: string) =>
    `internal/workflows_extensions_example/managed_service_account/${id}`;

  const accountIds = new Set<string>();

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
  }: {
    apiClient: ApiClientFixture;
    samlAuth: SamlAuth;
    config: ScoutTestConfig;
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
    for (const name of ['primary', 'child']) {
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
          roles: [config.serverless ? 'admin' : 'superuser'],
        },
        responseType: 'json',
      });
      expect(response, JSON.stringify(response.body)).toHaveStatusCode(200);
      accountIds.add(response.body.id as string);
      accounts.push(response.body.id as string);
    }
    [accountId, otherAccountId] = accounts;
  };

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
    if (failures.length) throw new AggregateError(failures, 'Service-account suite cleanup failed');
  };
  return {
    setup,
    teardown,
    cleanupWorkflows,
    getContext: () => ({
      headers,
      accountId,
      otherAccountId,
      managedIds,
      managedPath,
      wait,
      expectAccount,
    }),
  };
};
