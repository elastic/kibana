/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { createEsClientForTesting } from '@kbn/test-es-server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { workflowSystemIndex } from '../../../../server/storage/indices';
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

    const managedIds = new Set<string>();

    let systemClient: Client;

    apiTest.beforeAll(async ({ apiClient, samlAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      systemClient = createEsClientForTesting({
        esUrl: config.hosts.elasticsearch,
        authOverride: {
          username: SYSTEM_INDICES_SUPERUSER,
          password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
        },
        isCloud: config.isCloud,
      });
    });

    apiTest.afterEach(async ({ apiClient }) => {
      for (const id of managedIds) {
        await systemClient.update({
          index: workflowSystemIndex('workflows'),
          id,
          doc: { managed: false },
          refresh: 'wait_for',
        });
      }
      managedIds.clear();
      await cleanupWorkflows(apiClient);
    });

    apiTest.afterAll(async ({ apiClient, esClient, config }) => {
      try {
        await teardown({ apiClient, esClient, config });
      } finally {
        await systemClient?.close();
      }
    });

    for (const mode of ['inherit', 'rebind', 'user', 'route'] as const) {
      apiTest(
        `event subscribers retain their execution identity: ${mode}`,
        async ({ apiClient }) => {
          apiTest.setTimeout(180_000);
          const {
            headers,
            accountId,
            otherAccountId,
            create,
            run,
            wait,
            resume,
            updateYaml,
            expectAccount,
          } = getContext();
          const markManaged = async (id: string) => {
            // Seed trusted managed definitions without adding a production installation route for the test.
            await systemClient.update({
              index: workflowSystemIndex('workflows'),
              id,
              doc: { managed: true },
              refresh: 'wait_for',
            });
            managedIds.add(id);
          };
          const eventSource = `cp2-route-${Date.now()}`;
          const sourceYaml = workflowYaml(
            accountId,
            mode === 'route'
              ? `  - name: emit
    type: kibana.request
    with:
      method: POST
      path: /api/workflows_extensions_example/emit
      body:
        message: Identity regression
        source: ${eventSource}
`
              : `  - name: fail
    type: elasticsearch.request
    with:
      method: GET
      path: /cp2-no-event-index-${Date.now()}/_doc/missing
`
          );
          const sourceId = await create(
            apiClient,
            mode === 'user'
              ? sourceYaml.replace(
                  `settings:
  run_as: ${accountId}
`,
                  ''
                )
              : sourceYaml
          );
          if (mode !== 'user') await markManaged(sourceId);
          const subscriptionYaml = (yaml: string) =>
            yaml.replace(
              '  - type: manual',
              mode === 'route'
                ? `  - type: example.customTrigger
    on:
      condition: 'event.source: "${eventSource}"'`
                : `  - type: workflows.failed
    on:
      condition: 'event.workflow.id: "${sourceId}"'`
            );
          const unboundYaml = workflowYaml(accountId).replace(
            `settings:
  run_as: ${accountId}
`,
            ''
          );
          const ordinaryId = await create(apiClient, subscriptionYaml(unboundYaml));
          const boundId = await create(apiClient, subscriptionYaml(workflowYaml(otherAccountId)));
          const managedYaml = subscriptionYaml(
            workflowYaml(accountId, waitStep + authenticationStep).replace(
              `settings:
  run_as: ${accountId}
`,
              ''
            )
          );
          const managedId = await create(apiClient, managedYaml);
          await markManaged(managedId);
          const executions = async (id: string): Promise<WorkflowExecutionDto[]> => {
            const result = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
              headers,
              responseType: 'json',
            });
            expect(result).toHaveStatusCode(200);
            return result.body.results;
          };
          await wait(
            apiClient,
            await run(apiClient, sourceId),
            mode === 'route' ? 'completed' : 'failed'
          );
          await expect
            .poll(async () => (await executions(managedId)).length, { timeout: 30_000 })
            .toBe(1);
          const [handler] = await executions(managedId);
          const paused = await wait(apiClient, handler.id, 'waiting_for_input');
          const expectedIdentity =
            mode === 'user'
              ? undefined
              : {
                  type: 'service_account',
                  id: accountId,
                  inheritedFrom: { workloadId: sourceId },
                };
          expect(paused.effectiveIdentity).toStrictEqual(expectedIdentity);
          await expect
            .poll(async () => (await executions(boundId)).length, { timeout: 30_000 })
            .toBe(1);
          expectAccount(
            await wait(apiClient, (await executions(boundId))[0].id),
            otherAccountId,
            mode === 'route' ? { username: accountId } : undefined
          );
          await expect
            .poll(async () => (await executions(ordinaryId)).length, { timeout: 30_000 })
            .toBe(mode === 'user' ? 1 : 0);
          for (const ordinary of await executions(ordinaryId)) {
            expect((await wait(apiClient, ordinary.id)).effectiveIdentity).toBeUndefined();
          }
          if (mode === 'rebind') {
            await systemClient.update({
              index: workflowSystemIndex('workflows'),
              id: sourceId,
              doc: { managed: false },
              refresh: 'wait_for',
            });
            await updateYaml(apiClient, sourceId, sourceYaml.replace(accountId, otherAccountId));
            await markManaged(sourceId);
          }
          await resume(apiClient, {
            id: managedId,
            yaml: managedYaml,
            executionId: handler.id,
            stepExecutionId: paused.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
          });
          const finished = await wait(
            apiClient,
            handler.id,
            mode === 'rebind' ? 'failed' : 'completed'
          );
          expect(finished.effectiveIdentity).toStrictEqual(expectedIdentity);
          expect(finished.error?.type).toBe(
            mode === 'rebind' ? 'ServiceAccountExecutionError' : undefined
          );
          const authenticate = finished.stepExecutions?.find(
            (step) => step.stepId === 'authenticate'
          );
          expect(JSON.stringify(authenticate?.output ?? null)).toContain(
            mode === 'user' ? 'username' : mode === 'rebind' ? 'null' : accountId
          );
        }
      );
    }

    apiTest(
      'rejects an unmanaged HTTP emitter before persisting an unbound subscriber',
      async ({ apiClient }) => {
        const { headers, accountId, otherAccountId, create, run, wait } = getContext();
        const eventSource = `cp2-unmanaged-route-${Date.now()}`;
        const subscription = (yaml: string) =>
          yaml.replace(
            '  - type: manual',
            `  - type: example.customTrigger
    on:
      condition: 'event.source: "${eventSource}"'`
          );
        const subscriberId = await create(
          apiClient,
          subscription(
            workflowYaml(accountId).replace(
              `settings:
  run_as: ${accountId}
`,
              ''
            )
          )
        );
        await systemClient.update({
          index: workflowSystemIndex('workflows'),
          id: subscriberId,
          doc: { managed: true },
          refresh: 'wait_for',
        });
        managedIds.add(subscriberId);
        const boundId = await create(apiClient, subscription(workflowYaml(otherAccountId)));
        const sourceId = await create(
          apiClient,
          workflowYaml(
            accountId,
            `  - name: emit
    type: kibana.request
    with:
      method: POST
      path: /api/workflows_extensions_example/emit
      body:
        message: Unmanaged emitter rejection
        source: ${eventSource}
`
          )
        );
        await wait(apiClient, await run(apiClient, sourceId));
        const executions = async (id: string): Promise<WorkflowExecutionDto[]> => {
          const result = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
            headers,
            responseType: 'json',
          });
          expect(result).toHaveStatusCode(200);
          return result.body.results;
        };
        // The route awaits event delivery; the bound subscriber proves the event was handled.
        await expect.poll(async () => (await executions(boundId)).length).toBe(1);
        await wait(apiClient, (await executions(boundId))[0].id);
        expect(await executions(subscriberId)).toStrictEqual([]);
      }
    );

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
        expectAccount(await wait(apiClient, String(handler?.id)), otherAccountId, {
          username: otherAccountId,
        });
      }
    );
  }
);
