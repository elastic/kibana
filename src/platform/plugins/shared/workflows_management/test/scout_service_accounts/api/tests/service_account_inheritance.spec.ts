/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import {
  authenticationStep,
  createServiceAccountSuite,
  waitStep,
  workflowYaml,
} from '../fixtures/service_account_suite';

const executionTimeout = 150_000;

const revision = (yaml: string): string => createHash('sha256').update(yaml).digest('hex');
const unboundYaml = (steps = authenticationStep): string => `name: Approved child
enabled: true
triggers:
  - type: manual
steps:
${steps}`;
const callStep = (id: string, type = 'workflow.execute', inherit = true): string => `  - name: child
    type: ${type}
    with:
      workflow-id: ${id}
      inheritRunAs: ${inherit}
`;
const authenticatedAs = (execution: WorkflowExecutionDto): string =>
  JSON.stringify(execution.stepExecutions?.find((step) => step.stepId === 'authenticate')?.output);

apiTest.describe(
  'Workflow service account inheritance',
  { tag: ['@local-stateful-classic'] },
  () => {
    const { setup, teardown, getContext, cleanupWorkflows } = createServiceAccountSuite();
    let headers: Record<string, string>;
    let editorHeaders: Record<string, string>;
    let editorApprovalHeaders: Record<string, string>;

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
      const editorSession = await samlAuth.asInteractiveUser({
        elasticsearch: { cluster: [], indices: [] },
        kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
      });
      editorApprovalHeaders = { ...common, ...editorSession.cookieHeader };
    });

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

    const approve = async (apiClient: ApiClientFixture, id: string) => {
      const approvalHeaders = getContext().headers;
      const review = await apiClient.get(`internal/workflows/${id}/child_approvals`, {
        headers: approvalHeaders,
        responseType: 'json',
      });
      expect(review, JSON.stringify(review.body)).toHaveStatusCode(200);
      const result = await apiClient.post(`internal/workflows/${id}/child_approvals`, {
        headers: approvalHeaders,
        body: { reviewToken: review.body.reviewToken },
        responseType: 'json',
      });
      expect(result, JSON.stringify(result.body)).toHaveStatusCode(200);
    };

    const children = async (
      apiClient: ApiClientFixture,
      id: string
    ): Promise<WorkflowExecutionDto[]> => {
      const response = await apiClient.get(`api/workflows/workflow/${id}/executions`, {
        headers,
        responseType: 'json',
      });
      expect(response).toHaveStatusCode(200);
      return response.body.results;
    };

    for (const { type, parentStatus } of [
      { type: 'workflow.execute', parentStatus: 'waiting_for_child' },
      { type: 'workflow.executeAsync', parentStatus: 'completed' },
    ]) {
      apiTest(
        `${type} preserves the approved snapshot and identity across child resume`,
        async ({ apiClient }) => {
          apiTest.setTimeout(executionTimeout);
          const { readOnlyAccountId, create, run, wait, resume } = getContext();
          const yaml = unboundYaml(waitStep + authenticationStep);
          const childId = await create(apiClient, yaml, headers);
          const parentId = await create(
            apiClient,
            workflowYaml(readOnlyAccountId, callStep(childId, type)),
            headers
          );
          await approve(apiClient, parentId);
          const parentExecutionId = await run(apiClient, parentId, editorHeaders);
          const parent = await wait(apiClient, parentExecutionId, parentStatus, headers);
          const step = parent.stepExecutions?.find((item) => item.stepId === 'child');
          const childExecutionId =
            step?.state?.executionId ?? (step?.output as { executionId: string })?.executionId;
          expect(typeof childExecutionId).toBe('string');
          const paused = await wait(
            apiClient,
            String(childExecutionId),
            'waiting_for_input',
            headers
          );
          // An ordinary editor can change the unbound child, but cannot change the approved snapshot already admitted.
          const edit = await apiClient.put(`api/workflows/workflow/${childId}`, {
            headers: editorHeaders,
            body: {
              yaml: `${yaml}  - name: injected\n    type: console\n    with:\n      message: Unapproved\n`,
            },
            responseType: 'json',
          });
          expect(edit, JSON.stringify(edit.body)).toHaveStatusCode(200);
          await resume(
            apiClient,
            {
              id: childId,
              yaml,
              executionId: paused.id,
              stepExecutionId: paused.stepExecutions?.find((item) => item.stepId === 'approval')
                ?.id,
            },
            editorHeaders
          );
          const completed = await wait(apiClient, paused.id, 'completed', headers);
          expect(authenticatedAs(completed)).toContain(readOnlyAccountId);
          expect(completed.executedBy).toBe(parent.executedBy);
          expect(completed.effectiveIdentity).toStrictEqual({
            type: 'service_account',
            id: readOnlyAccountId,
            inheritedFrom: {
              workloadId: parentId,
              workflowId: parentId,
              executionId: parentExecutionId,
              revision: revision(yaml),
            },
          });
          expect(completed.stepExecutions?.some((item) => item.stepId === 'injected')).toBe(false);
          await wait(apiClient, parentExecutionId, 'completed', headers);
        }
      );
    }

    apiTest(
      'keeps approved code after edits and requires explicit privileged reapproval',
      async ({ apiClient }) => {
        apiTest.setTimeout(executionTimeout);
        const { readOnlyAccountId, create, run, wait, headers: approvalHeaders } = getContext();
        const yaml = unboundYaml();
        const childId = await create(apiClient, yaml, headers);
        const parentYaml = workflowYaml(readOnlyAccountId, callStep(childId));
        const parentId = await create(apiClient, parentYaml, headers);
        const pending = await wait(
          apiClient,
          await run(apiClient, parentId, headers),
          'failed',
          headers
        );
        expect(JSON.stringify(pending.stepExecutions)).toContain('Review and approve');
        expect(await children(apiClient, childId)).toHaveLength(0);
        await approve(apiClient, parentId);
        const review = await apiClient.get(`internal/workflows/${parentId}/child_approvals`, {
          headers: approvalHeaders,
          responseType: 'json',
        });
        expect(review).toHaveStatusCode(200);
        const changed = `${yaml}  - name: injected\n    type: console\n    with:\n      message: Unapproved\n`;
        const edit = await apiClient.put(`api/workflows/workflow/${childId}`, {
          headers: editorHeaders,
          body: { yaml: changed },
          responseType: 'json',
        });
        expect(edit).toHaveStatusCode(200);
        const stale = await apiClient.post(`internal/workflows/${parentId}/child_approvals`, {
          headers: approvalHeaders,
          body: { reviewToken: review.body.reviewToken },
          responseType: 'json',
        });
        expect(stale).toHaveStatusCode(409);
        const current = await apiClient.get(`internal/workflows/${parentId}/child_approvals`, {
          headers: approvalHeaders,
          responseType: 'json',
        });
        expect(current).toHaveStatusCode(200);
        expect(current.body.children[0]).toMatchObject({
          status: 'changed',
          approvedVersion: 1,
          currentVersion: 2,
        });
        const forbidden = await apiClient.post(`internal/workflows/${parentId}/child_approvals`, {
          headers: editorApprovalHeaders,
          body: { reviewToken: current.body.reviewToken },
          responseType: 'json',
        });
        expect(forbidden).toHaveStatusCode(403);
        expect(JSON.stringify(forbidden.body)).toContain('manage_security');
        const save = await apiClient.put(`api/workflows/workflow/${parentId}`, {
          headers,
          body: { yaml: `${parentYaml}\n` },
          responseType: 'json',
        });
        expect(save).toHaveStatusCode(200);
        await wait(apiClient, await run(apiClient, parentId, headers), 'completed', headers);
        const first = await children(apiClient, childId);
        expect(first).toHaveLength(1);
        const approvedChild = await wait(apiClient, first[0].id, 'completed', headers);
        expect(approvedChild.stepExecutions?.some((step) => step.stepId === 'injected')).toBe(
          false
        );
        expect(authenticatedAs(approvedChild)).toContain(readOnlyAccountId);
        await approve(apiClient, parentId);
        await wait(apiClient, await run(apiClient, parentId, headers), 'completed', headers);
        const runs = await children(apiClient, childId);
        expect(runs).toHaveLength(2);
        const updatedRun = runs.find((execution) => execution.id !== first[0].id);
        expect(updatedRun).toBeDefined();
        const updated = await wait(apiClient, String(updatedRun?.id), 'completed', headers);
        expect(updated.stepExecutions?.some((step) => step.stepId === 'injected')).toBe(true);
      }
    );

    for (const { reason, childYaml, parentYaml, message } of [
      {
        reason: 'child identity conflict',
        childYaml: workflowYaml,
        parentYaml: workflowYaml,
        message: 'Review and approve',
      },
      {
        reason: 'parent without service account',
        childYaml: () => unboundYaml(),
        parentYaml: (_account: string, steps: string) => unboundYaml(steps),
        message: 'requires a parent executing as a service account',
      },
    ]) {
      apiTest(`rejects ${reason}`, async ({ apiClient }) => {
        const { accountId, readOnlyAccountId, create, run, wait } = getContext();
        const yaml = childYaml(readOnlyAccountId);
        const childId = await create(apiClient, yaml, headers);
        const steps = callStep(childId);
        const parentId = await create(apiClient, parentYaml(accountId, steps), headers);
        const parent = await wait(
          apiClient,
          await run(apiClient, parentId, headers),
          'failed',
          headers
        );
        expect(JSON.stringify(parent.stepExecutions)).toContain(message);
        expect(await children(apiClient, childId)).toHaveLength(0);
      });
    }

    apiTest(
      'executes approved nested children and explicit identity overrides',
      async ({ apiClient }) => {
        apiTest.setTimeout(executionTimeout);
        const { accountId, readOnlyAccountId, create, run, wait } = getContext();
        const grandchild = await create(apiClient, workflowYaml(accountId), headers);
        const child = await create(
          apiClient,
          unboundYaml(callStep(grandchild).replace('inheritRunAs: true', 'runAsMode: override')),
          headers
        );
        const parent = await create(
          apiClient,
          workflowYaml(readOnlyAccountId, callStep(child)),
          headers
        );
        await approve(apiClient, parent);
        const edited = await apiClient.put(`api/workflows/workflow/${child}`, {
          headers: editorHeaders,
          body: { yaml: unboundYaml() },
          responseType: 'json',
        });
        expect(edited).toHaveStatusCode(200);
        await wait(apiClient, await run(apiClient, parent, editorHeaders), 'completed', headers);
        const grandchildRuns = await children(apiClient, grandchild);
        expect(grandchildRuns).toHaveLength(1);
        const result = await wait(apiClient, grandchildRuns[0].id, 'completed', headers);
        expect(authenticatedAs(result)).toContain(readOnlyAccountId);
        expect(result.effectiveIdentity?.inheritedFrom?.workloadId).toBe(parent);
        const saved = await apiClient.get(`api/workflows/workflow/${grandchild}`, {
          headers,
          responseType: 'json',
        });
        expect(saved).toHaveStatusCode(200);
        expect(saved.body.definition.settings.run_as).toBe(accountId);
      }
    );

    apiTest(
      'default-off retains the original caller for an unbound child',
      async ({ apiClient }) => {
        const { accountId, create, run, wait } = getContext();
        const yaml = unboundYaml();
        const childId = await create(apiClient, yaml, headers);
        const parentId = await create(
          apiClient,
          workflowYaml(accountId, callStep(childId, 'workflow.execute', false)),
          headers
        );
        const parent = await wait(
          apiClient,
          await run(apiClient, parentId, editorHeaders),
          'completed',
          headers
        );
        const executions = await children(apiClient, childId);
        expect(executions).toHaveLength(1);
        const child = await wait(apiClient, executions[0].id, 'completed', headers);
        expect(child.effectiveIdentity).toBeUndefined();
        expect(child.executedBy).toBe(parent.executedBy);
        expect(authenticatedAs(child)).not.toContain(accountId);
      }
    );

    apiTest(
      'revoking the parent binding fails the paused child without caller fallback',
      async ({ apiClient }) => {
        apiTest.setTimeout(executionTimeout);
        const { readOnlyAccountId, create, run, wait, resume } = getContext();
        const yaml = unboundYaml(waitStep + authenticationStep);
        const childId = await create(apiClient, yaml, headers);
        const parentSteps = callStep(childId, 'workflow.executeAsync');
        const parentId = await create(
          apiClient,
          workflowYaml(readOnlyAccountId, parentSteps),
          headers
        );
        await approve(apiClient, parentId);
        const parent = await wait(
          apiClient,
          await run(apiClient, parentId, headers),
          'completed',
          headers
        );
        const output = parent.stepExecutions?.find((item) => item.stepId === 'child')?.output as {
          executionId: string;
        };
        const paused = await wait(apiClient, output.executionId, 'waiting_for_input', headers);
        const unbind = await apiClient.put(`api/workflows/workflow/${parentId}`, {
          headers,
          body: { yaml: unboundYaml(parentSteps) },
          responseType: 'json',
        });
        expect(unbind, JSON.stringify(unbind.body)).toHaveStatusCode(200);
        await resume(
          apiClient,
          {
            id: childId,
            yaml,
            executionId: paused.id,
            stepExecutionId: paused.stepExecutions?.find((item) => item.stepId === 'approval')?.id,
          },
          headers
        );
        const failed = await wait(apiClient, paused.id, 'failed', headers);
        expect(failed.error?.type).toBe('ServiceAccountExecutionError');
        expect(failed.stepExecutions?.some((item) => item.stepId === 'authenticate')).toBe(false);
      }
    );
  }
);
