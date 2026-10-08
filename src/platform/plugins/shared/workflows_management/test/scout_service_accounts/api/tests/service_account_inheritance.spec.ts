/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto, WorkflowRunAsMode } from '@kbn/workflows';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { workflowSystemIndex } from '../../../../server/storage/indices';
import { authenticationStep, createServiceAccountSuite } from '../fixtures/service_account_suite';

interface ManagedOptions {
  serviceAccountId?: string;
  childWorkflowId?: string;
  runAsMode?: WorkflowRunAsMode;
  asynchronous?: boolean;
  waitForInput?: boolean;
  message?: string;
  global?: boolean;
  fallbackChild?: boolean;
}
const authenticatedAs = (execution: WorkflowExecutionDto): string =>
  JSON.stringify(execution.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output);
const path = (suffix: string): string =>
  `internal/workflows_extensions_example/managed_service_account/${suffix}`;
const workflowId = (suffix: string): string => `system-example-service-account-${suffix}`;

apiTest.describe(
  'Managed child service account inheritance',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite();
    const installed = new Map<string, boolean>();
    let headers: Record<string, string>;
    let editorHeaders: Record<string, string>;

    apiTest.beforeAll(async ({ requestAuth, apiClient, samlAuth, config, esClient }) => {
      await setup({ apiClient, samlAuth, config, esClient });
      const admin = await requestAuth.getApiKey('admin');
      const editor = await requestAuth.getApiKeyForCustomRole({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });
      const common = {
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '2023-10-31',
      };
      headers = { ...common, ...admin.apiKeyHeader };
      editorHeaders = { ...common, ...editor.apiKeyHeader };
    });

    const waitForNoRunningExecutions = async (apiClient: ApiClientFixture, suffix: string) => {
      const query = new URLSearchParams();
      NonTerminalExecutionStatuses.forEach((status) => query.append('statuses', status));
      await expect
        .poll(
          async () => {
            const active = await apiClient.get(
              `api/workflows/workflow/${workflowId(suffix)}/executions?${query}`,
              { headers, responseType: 'json' }
            );
            expect(active).toHaveStatusCode(200);
            return active.body.results.length;
          },
          { timeout: 30_000 }
        )
        .toBe(0);
    };

    const cleanupManagedWorkflows = async (apiClient: ApiClientFixture) => {
      const failures: Error[] = [];
      for (const [suffix, global] of [...installed].reverse()) {
        try {
          const cancelled = await apiClient.post(
            `api/workflows/workflow/${workflowId(suffix)}/executions/cancel`,
            { headers, responseType: 'json' }
          );
          expect(cancelled, JSON.stringify(cancelled.body)).toHaveStatusCode(200);
          await waitForNoRunningExecutions(apiClient, suffix);
          const deleted = await apiClient.delete(global ? `${path(suffix)}/global` : path(suffix), {
            headers: getContext().headers,
            responseType: 'json',
          });
          expect(deleted, JSON.stringify(deleted.body)).toHaveStatusCode(204);
          installed.delete(suffix);
        } catch (error) {
          failures.push(new Error(`Failed to clean managed workflow ${suffix}`, { cause: error }));
        }
      }
      try {
        await cleanupWorkflows(apiClient);
      } catch (error) {
        failures.push(new Error('Failed to clean ordinary workflows', { cause: error }));
      }
      if (failures.length > 0) throw new AggregateError(failures, 'Workflow cleanup failed');
    };

    apiTest.afterEach(async ({ apiClient }) => cleanupManagedWorkflows(apiClient));

    apiTest.afterAll(teardown);

    const install = async (
      apiClient: ApiClientFixture,
      options: ManagedOptions = {},
      existing?: string
    ) => {
      const suffix = existing ?? `inherit-${Date.now()}-${installed.size}`;
      const { global = false, ...body } = options;
      const result = await apiClient.post(global ? `${path(suffix)}/global` : path(suffix), {
        headers: getContext().headers,
        body,
        responseType: 'json',
      });
      expect(result, JSON.stringify(result.body)).toHaveStatusCode(200);
      installed.set(suffix, global);
      return suffix;
    };
    const run = async (
      apiClient: ApiClientFixture,
      suffix: string,
      requestHeaders = editorHeaders
    ) => {
      const result = await apiClient.post(`${path(suffix)}/run`, {
        headers: requestHeaders,
        body: {},
        responseType: 'json',
      });
      expect(result, JSON.stringify(result.body)).toHaveStatusCode(200);
      return result.body.workflowExecutionId as string;
    };
    const childExecution = async (
      apiClient: ApiClientFixture,
      parent: WorkflowExecutionDto,
      stepId = 'child'
    ) => {
      const call = parent.stepExecutions?.find((step) => step.stepId === stepId);
      const id =
        call?.state?.executionId ?? (call?.output as { executionId?: string })?.executionId;
      expect(typeof id).toBe('string');
      const response = await apiClient.get(`api/workflows/executions/${id}?includeOutput=true`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body as WorkflowExecutionDto;
    };
    const resume = async (apiClient: ApiClientFixture, execution: WorkflowExecutionDto) => {
      const result = await apiClient.post(`api/workflows/executions/${execution.id}/resume`, {
        headers: editorHeaders,
        body: {
          input: { approved: true },
          stepExecutionId: execution.stepExecutions?.find((step) => step.stepId === 'approval')?.id,
        },
        responseType: 'json',
      });
      expect(result, JSON.stringify(result.body)).toHaveStatusCode(200);
    };
    const expectNoChildren = async (apiClient: ApiClientFixture, id: string) => {
      const executions = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
        headers,
        responseType: 'json',
      });
      expect(executions).toHaveStatusCode(200);
      expect(executions.body.results).toHaveLength(0);
    };

    const configureDynamicChild = async (
      apiClient: ApiClientFixture,
      parent: string,
      targetId: string,
      allowedIds: string[]
    ) => {
      const saved = await apiClient.get(`api/workflows/workflow/${workflowId(parent)}`, {
        headers,
        responseType: 'json',
      });
      expect(saved).toHaveStatusCode(200);
      const yaml = saved.body.yaml
        .replace(
          'steps:\n',
          `steps:\n  - name: select_action\n    type: data.set\n    with:\n      action_workflow_id: ${JSON.stringify(
            targetId
          )}\n`
        )
        .replace(
          `workflow-id: ${JSON.stringify(targetId)}`,
          `workflow-id: '{{ variables.action_workflow_id }}'\n      allowed-workflow-ids: ${JSON.stringify(
            allowedIds
          )}`
        );
      const updated = await apiClient.put(`api/workflows/managed/workflow/${workflowId(parent)}`, {
        headers: getContext().headers,
        body: { yaml },
        responseType: 'json',
      });
      expect(updated, JSON.stringify(updated.body)).toHaveStatusCode(200);
    };

    for (const asynchronous of [false, true]) {
      apiTest(
        `${
          asynchronous ? 'async' : 'sync'
        } allowlisted variable child inherits the worker SA after approval`,
        async ({ apiClient }) => {
          apiTest.setTimeout(150_000);
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient, { global: true });
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            waitForInput: true,
            asynchronous,
          });
          await configureDynamicChild(apiClient, parent, workflowId(child), [workflowId(child)]);
          const paused = await wait(
            apiClient,
            await run(apiClient, parent),
            'waiting_for_input',
            headers
          );
          await resume(apiClient, paused);
          const completed = await wait(apiClient, paused.id, 'completed', headers);
          const childRun = await childExecution(apiClient, completed);
          const completedChild = await wait(apiClient, childRun.id, 'completed', headers);
          expect(authenticatedAs(completedChild)).toContain(readOnlyAccountId);
          expect(completedChild.effectiveIdentity?.inheritedFrom?.workloadId).toBe(
            workflowId(parent)
          );
        }
      );

      apiTest(
        `${asynchronous ? 'async' : 'sync'} variable child outside the allowlist never starts`,
        async ({ apiClient }) => {
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient);
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            asynchronous,
          });
          await configureDynamicChild(apiClient, parent, workflowId(child), [
            'another-managed-action',
          ]);
          const failed = await wait(apiClient, await run(apiClient, parent), 'failed', headers);
          expect(JSON.stringify(failed.stepExecutions)).toContain('not approved');
          await expectNoChildren(apiClient, workflowId(child));
        }
      );
    }

    apiTest(
      'requires superuser privileges for global example mutations',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [
            {
              base: [],
              feature: { workflowsManagement: ['all', 'workflow_update_managed'] },
              spaces: ['default'],
            },
          ],
        });
        const scopedHeaders = { ...getContext().headers, ...cookieHeader };
        const suffix = `scope-${Date.now()}`;
        const local = await apiClient.post(path(suffix), {
          headers: scopedHeaders,
          body: {},
          responseType: 'json',
        });
        expect(local, JSON.stringify(local.body)).toHaveStatusCode(200);
        installed.set(suffix, false);
        const localDelete = await apiClient.delete(path(suffix), {
          headers: scopedHeaders,
          responseType: 'json',
        });
        expect(localDelete, JSON.stringify(localDelete.body)).toHaveStatusCode(204);
        installed.delete(suffix);
        const create = await apiClient.post(`${path(suffix)}/global`, {
          headers: scopedHeaders,
          body: {},
          responseType: 'json',
        });
        expect(create, JSON.stringify(create.body)).toHaveStatusCode(403);
        await install(apiClient, { global: true }, suffix);
        const replace = await apiClient.post(`${path(suffix)}/global`, {
          headers: scopedHeaders,
          body: { message: 'unauthorized replacement' },
          responseType: 'json',
        });
        expect(replace, JSON.stringify(replace.body)).toHaveStatusCode(403);
        const remove = await apiClient.delete(`${path(suffix)}/global`, {
          headers: scopedHeaders,
          responseType: 'json',
        });
        expect(remove, JSON.stringify(remove.body)).toHaveStatusCode(403);
        const saved = await apiClient.get(`api/workflows/workflow/${workflowId(suffix)}`, {
          headers,
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.yaml).not.toContain('unauthorized replacement');
      }
    );

    apiTest('cleans up waiting inherited executions', async ({ apiClient }) => {
      const { accountId, wait } = getContext();
      const child = await install(apiClient, { global: true, waitForInput: true });
      const parent = await install(apiClient, {
        serviceAccountId: accountId,
        childWorkflowId: workflowId(child),
        runAsMode: 'inherit',
      });
      const parentExecution = await wait(
        apiClient,
        await run(apiClient, parent),
        'waiting_for_child',
        headers
      );
      const childRun = await childExecution(apiClient, parentExecution);
      await wait(apiClient, childRun.id, 'waiting_for_input', headers);
      await cleanupManagedWorkflows(apiClient);
      expect(installed.size).toBe(0);
      for (const suffix of [parent, child]) {
        const saved = await apiClient.get(`api/workflows/workflow/${workflowId(suffix)}`, {
          headers,
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(404);
      }
    });

    for (const asynchronous of [false, true]) {
      apiTest(
        `${
          asynchronous ? 'async' : 'sync'
        } managed child retains inherited identity through wait and resume`,
        async ({ apiClient }) => {
          apiTest.setTimeout(150_000);
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient, { waitForInput: true });
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            asynchronous,
          });
          const parentExecution = await wait(
            apiClient,
            await run(apiClient, parent),
            asynchronous ? 'completed' : 'waiting_for_child',
            headers
          );
          const childRun = await childExecution(apiClient, parentExecution);
          const paused = await wait(apiClient, childRun.id, 'waiting_for_input', headers);
          const saved = await apiClient.get(`api/workflows/workflow/${workflowId(child)}`, {
            headers,
            responseType: 'json',
          });
          expect(saved).toHaveStatusCode(200);
          expect(saved.body.managed).toBe(true);
          const edit = await apiClient.put(`api/workflows/workflow/${workflowId(child)}`, {
            headers: editorHeaders,
            body: { yaml: `${saved.body.yaml}\n` },
            responseType: 'json',
          });
          expect(edit).toHaveStatusCode(403);
          // Expire the short-lived SA access token before resuming from the durable binding.
          await new Promise((resolve) => setTimeout(resolve, 16_000));
          await resume(apiClient, paused);
          const completed = await wait(apiClient, paused.id, 'completed', headers);
          expect(authenticatedAs(completed)).toContain(readOnlyAccountId);
          expect(completed.executedBy).toBe(parentExecution.executedBy);
          expect(completed.context).toMatchObject({
            parentWorkflowId: workflowId(parent),
            parentWorkflowExecutionId: parentExecution.id,
          });
          expect(completed.effectiveIdentity).toMatchObject({
            type: 'service_account',
            id: readOnlyAccountId,
            inheritedFrom: {
              workloadId: workflowId(parent),
            },
          });
          await wait(apiClient, parentExecution.id, 'completed', headers);
        }
      );
    }

    for (const asynchronous of [false, true]) {
      apiTest(
        `${
          asynchronous ? 'async' : 'sync'
        } global managed child inherits a per-space binding through resume`,
        async ({ apiClient, esClient }) => {
          apiTest.setTimeout(150_000);
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient, { waitForInput: true, global: true });
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            asynchronous,
          });
          const parentRun = await wait(
            apiClient,
            await run(apiClient, parent),
            asynchronous ? 'completed' : 'waiting_for_child',
            headers
          );
          const childRun = await childExecution(apiClient, parentRun);
          const paused = await wait(apiClient, childRun.id, 'waiting_for_input', headers);
          const stored = await esClient.get<{ spaceId: string }>({
            index: workflowSystemIndex('executions'),
            id: childRun.id,
          });
          expect(stored._source?.spaceId).toBe('default');
          await new Promise((resolve) => setTimeout(resolve, 16_000));
          await resume(apiClient, paused);
          const completed = await wait(apiClient, childRun.id, 'completed', headers);
          expect(authenticatedAs(completed)).toContain(readOnlyAccountId);
          expect(completed.effectiveIdentity?.inheritedFrom?.workloadId).toBe(workflowId(parent));
          await wait(apiClient, parentRun.id, 'completed', headers);
        }
      );
    }

    for (const asynchronous of [false, true]) {
      apiTest(
        `${
          asynchronous ? 'async' : 'sync'
        } workflow-level fallback inherits the parent service account`,
        async ({ apiClient }) => {
          apiTest.setTimeout(150_000);
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient);
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            fallbackChild: true,
            asynchronous,
          });
          const parentRun = await wait(apiClient, await run(apiClient, parent), 'failed', headers);
          const childRun = await childExecution(
            apiClient,
            parentRun,
            'workflow-level-on-failure_fail_child'
          );
          const completed = await wait(apiClient, childRun.id, 'completed', headers);
          expect(authenticatedAs(completed)).toContain(readOnlyAccountId);
          expect(completed.effectiveIdentity?.inheritedFrom?.workloadId).toBe(workflowId(parent));
        }
      );
    }

    for (const global of [false, true]) {
      apiTest(
        `blocks uninstall while an inherited child is active (global=${global})`,
        async ({ apiClient }) => {
          apiTest.setTimeout(150_000);
          const { readOnlyAccountId, wait } = getContext();
          const child = await install(apiClient, { global, waitForInput: true });
          const parent = await install(apiClient, {
            serviceAccountId: readOnlyAccountId,
            childWorkflowId: workflowId(child),
            runAsMode: 'inherit',
            asynchronous: true,
          });
          const parentRun = await wait(
            apiClient,
            await run(apiClient, parent),
            'completed',
            headers
          );
          const childRun = await childExecution(apiClient, parentRun);
          const paused = await wait(apiClient, childRun.id, 'waiting_for_input', headers);
          try {
            const deleted = await apiClient.delete(global ? `${path(child)}/global` : path(child), {
              headers: getContext().headers,
              responseType: 'json',
            });
            expect(deleted).toHaveStatusCode(409);
            expect(deleted.body.message).toContain('running executions');
          } finally {
            await resume(apiClient, paused);
            const completed = await wait(apiClient, childRun.id, 'completed', headers);
            expect(authenticatedAs(completed)).toContain(readOnlyAccountId);
          }
          // Execution reads are realtime; deletion searches wait for the index refresh.
          await waitForNoRunningExecutions(apiClient, child);
          const deleted = await apiClient.delete(global ? `${path(child)}/global` : path(child), {
            headers: getContext().headers,
            responseType: 'json',
          });
          expect(deleted).toHaveStatusCode(204);
          installed.delete(child);
        }
      );
    }

    apiTest(
      'uses the latest installed child without a revision approval',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, wait } = getContext();
        const child = await install(apiClient, { message: 'version one' });
        const parent = await install(apiClient, {
          serviceAccountId: readOnlyAccountId,
          childWorkflowId: workflowId(child),
          runAsMode: 'inherit',
        });
        for (const message of ['version one', 'version two']) {
          await install(apiClient, { message }, child);
          const completed = await wait(
            apiClient,
            await run(apiClient, parent),
            'completed',
            headers
          );
          const execution = await childExecution(apiClient, completed);
          expect(execution.workflowDefinition.description).toBe(message);
          expect(authenticatedAs(execution)).toContain(readOnlyAccountId);
        }
      }
    );

    apiTest(
      'rejects unmanaged children before creating a delegated execution',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { create, readOnlyAccountId, wait } = getContext();
        const child = await create(
          apiClient,
          `name: Editable child\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n${authenticationStep}`,
          headers
        );
        const parent = await install(apiClient, {
          serviceAccountId: readOnlyAccountId,
          childWorkflowId: child,
          runAsMode: 'inherit',
        });
        const failed = await wait(apiClient, await run(apiClient, parent), 'failed', headers);
        expect(JSON.stringify(failed.stepExecutions)).toContain('Only managed child workflows');
        await expectNoChildren(apiClient, child);
      }
    );

    apiTest(
      'requires explicit override and leaves the child binding unchanged',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, otherAccountId, wait } = getContext();
        const child = await install(apiClient, { serviceAccountId: otherAccountId });
        const parentOptions = {
          serviceAccountId: readOnlyAccountId,
          childWorkflowId: workflowId(child),
        };
        const parent = await install(apiClient, { ...parentOptions, runAsMode: 'inherit' });
        const failed = await wait(apiClient, await run(apiClient, parent), 'failed', headers);
        expect(JSON.stringify(failed.stepExecutions)).toContain('run-as-mode: override');
        await expectNoChildren(apiClient, workflowId(child));
        await install(apiClient, { ...parentOptions, runAsMode: 'override' }, parent);
        const completed = await wait(apiClient, await run(apiClient, parent), 'completed', headers);
        expect(authenticatedAs(await childExecution(apiClient, completed))).toContain(
          readOnlyAccountId
        );
        expect(
          authenticatedAs(await wait(apiClient, await run(apiClient, child), 'completed', headers))
        ).toContain(otherAccountId);
      }
    );

    apiTest('rejects inheritance without a parent service account', async ({ apiClient }) => {
      apiTest.setTimeout(150_000);
      const { wait } = getContext();
      const child = await install(apiClient);
      const parent = await install(apiClient, {
        childWorkflowId: workflowId(child),
        runAsMode: 'inherit',
      });
      const failed = await wait(apiClient, await run(apiClient, parent), 'failed', headers);
      expect(JSON.stringify(failed.stepExecutions)).toContain(
        'requires a parent executing as a service account'
      );
      await expectNoChildren(apiClient, workflowId(child));
    });

    apiTest(
      'default preserves the original caller rather than inheriting implicitly',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, wait } = getContext();
        const child = await install(apiClient);
        const parent = await install(apiClient, {
          serviceAccountId: readOnlyAccountId,
          childWorkflowId: workflowId(child),
        });
        const completed = await wait(apiClient, await run(apiClient, parent), 'completed', headers);
        const execution = await childExecution(apiClient, completed);
        expect(execution.effectiveIdentity).toBeUndefined();
        expect(authenticatedAs(execution)).not.toContain(readOnlyAccountId);
        expect(execution.executedBy).toBe(completed.executedBy);
      }
    );

    apiTest(
      'nested inheritance keeps the root binding and rejects an unmanaged grandchild',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, create, wait } = getContext();
        const leaf = await install(apiClient);
        const child = await install(apiClient, {
          childWorkflowId: workflowId(leaf),
          runAsMode: 'inherit',
        });
        const parent = await install(apiClient, {
          serviceAccountId: readOnlyAccountId,
          childWorkflowId: workflowId(child),
          runAsMode: 'inherit',
        });
        const completed = await wait(apiClient, await run(apiClient, parent), 'completed', headers);
        const middle = await childExecution(apiClient, completed);
        const last = await childExecution(apiClient, middle);
        expect(authenticatedAs(last)).toContain(readOnlyAccountId);
        expect(last.effectiveIdentity?.inheritedFrom?.workloadId).toBe(workflowId(parent));
        const editable = await create(
          apiClient,
          `name: Editable leaf\nenabled: true\ntriggers:\n  - type: manual\nsteps:\n${authenticationStep}`,
          headers
        );
        await install(apiClient, { childWorkflowId: editable, runAsMode: 'inherit' }, child);
        await wait(apiClient, await run(apiClient, parent), 'failed', headers);
        await expectNoChildren(apiClient, editable);
      }
    );

    apiTest(
      'changing the root binding while an async child waits fails closed on resume',
      async ({ apiClient }) => {
        apiTest.setTimeout(150_000);
        const { readOnlyAccountId, otherAccountId, wait } = getContext();
        const child = await install(apiClient, { waitForInput: true });
        const options = {
          childWorkflowId: workflowId(child),
          runAsMode: 'inherit' as const,
          asynchronous: true,
        };
        const parent = await install(apiClient, {
          ...options,
          serviceAccountId: readOnlyAccountId,
        });
        const completed = await wait(apiClient, await run(apiClient, parent), 'completed', headers);
        const childRun = await childExecution(apiClient, completed);
        const paused = await wait(apiClient, childRun.id, 'waiting_for_input', headers);
        await install(apiClient, { ...options, serviceAccountId: otherAccountId }, parent);
        await resume(apiClient, paused);
        const failed = await wait(apiClient, paused.id, 'failed', headers);
        expect(failed.error?.type).toBe('ServiceAccountExecutionError');
        expect(failed.stepExecutions?.some((step) => step.stepId === 'authenticate')).toBe(false);
      }
    );
  }
);
