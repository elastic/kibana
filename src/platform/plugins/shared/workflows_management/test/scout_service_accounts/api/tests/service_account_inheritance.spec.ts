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
const callStep = (
  id: string,
  yaml: string,
  type = 'workflow.execute',
  inherit = true
): string => `  - name: child
    type: ${type}
    with:
      workflow-id: ${id}
      inheritRunAs: ${inherit}
      expectedRevision: ${revision(yaml)}
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

    apiTest.afterEach(async ({ apiClient }) => cleanupWorkflows(apiClient));

    apiTest.afterAll(teardown);

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
            workflowYaml(readOnlyAccountId, callStep(childId, yaml, type)),
            headers
          );
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
      'rejects an edited child before scheduling and requires privileged reapproval',
      async ({ apiClient }) => {
        apiTest.setTimeout(executionTimeout);
        const { readOnlyAccountId, create, run, wait } = getContext();
        const yaml = unboundYaml();
        const childId = await create(apiClient, yaml, headers);
        const parentId = await create(
          apiClient,
          workflowYaml(readOnlyAccountId, callStep(childId, yaml)),
          headers
        );
        const changed = yaml.replace('Approved child', 'Edited child');
        const edit = await apiClient.put(`api/workflows/workflow/${childId}`, {
          headers: editorHeaders,
          body: { yaml: changed },
          responseType: 'json',
        });
        expect(edit).toHaveStatusCode(200);
        const parent = await wait(
          apiClient,
          await run(apiClient, parentId, headers),
          'failed',
          headers
        );
        expect(JSON.stringify(parent.stepExecutions)).toContain('changed after approval');
        expect(await children(apiClient, childId)).toHaveLength(0);
        const approved = workflowYaml(readOnlyAccountId, callStep(childId, changed));
        const forbidden = await apiClient.put(`api/workflows/workflow/${parentId}`, {
          headers: editorHeaders,
          body: { yaml: approved },
          responseType: 'json',
        });
        expect(forbidden).toHaveStatusCode(403);
        expect(JSON.stringify(forbidden.body)).toContain('manage_security');
        const reapprove = await apiClient.put(`api/workflows/workflow/${parentId}`, {
          headers,
          body: { yaml: approved },
          responseType: 'json',
        });
        expect(reapprove).toHaveStatusCode(200);
        await wait(apiClient, await run(apiClient, parentId, headers), 'completed', headers);
      }
    );

    for (const { reason, childYaml, parentYaml, message } of [
      {
        reason: 'child identity conflict',
        childYaml: workflowYaml,
        parentYaml: workflowYaml,
        message: 'child has its own run_as',
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
        const steps = callStep(childId, yaml);
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
      'default-off retains the original caller for an unbound child',
      async ({ apiClient }) => {
        const { accountId, create, run, wait } = getContext();
        const yaml = unboundYaml();
        const childId = await create(apiClient, yaml, headers);
        const parentId = await create(
          apiClient,
          workflowYaml(accountId, callStep(childId, yaml, 'workflow.execute', false)),
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
        const parentSteps = callStep(childId, yaml, 'workflow.executeAsync');
        const parentId = await create(
          apiClient,
          workflowYaml(readOnlyAccountId, parentSteps),
          headers
        );
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
