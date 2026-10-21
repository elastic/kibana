/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { WorkflowsApiService } from '../../../common/apis/workflows';

const getHitlYaml = (name: string) => `
name: ${name}
enabled: true
triggers:
  - type: manual
steps:
  - name: ask
    type: waitForInput
    with:
      message: "Approve this action?"
      schema:
        type: object
        properties:
          approved:
            type: boolean
        required:
          - approved
`;

const WAITING_TIMEOUT = 30_000;
const TERMINAL_TIMEOUT = 30_000;

// Private workflows are only exercised on local stateful, like access_control.spec.ts.
apiTest.describe(
  'HITL resume across executions with restricted access',
  { tag: '@local-stateful-classic' },
  () => {
    const spaceId = `hitl-cross-${randomUUID()}`;
    const editorName = `hitl-editor-${randomUUID()}`;
    const apiHeaders = {
      'kbn-xsrf': 'scout',
      'x-elastic-internal-origin': 'kibana',
      'elastic-api-version': '2023-10-31',
    };
    let workflowsApi: WorkflowsApiService;
    let editorHeaders: Record<string, string>;
    const createdWorkflowIds: string[] = [];

    apiTest.beforeAll(async ({ kbnClient, esClient }) => {
      workflowsApi = new WorkflowsApiService(spaceId, kbnClient);
      await kbnClient.request({
        method: 'POST',
        path: '/api/spaces/space',
        body: { id: spaceId, name: spaceId },
      });
      await kbnClient.request({
        method: 'PUT',
        path: `/api/security/role/${editorName}`,
        body: {
          elasticsearch: { cluster: [] },
          kibana: [{ base: [], feature: { workflowsManagement: ['all'] }, spaces: [spaceId] }],
        },
      });
      const editorPassword = randomUUID();
      await esClient.security.putUser({
        username: editorName,
        password: editorPassword,
        roles: [editorName],
      });
      editorHeaders = {
        ...apiHeaders,
        Authorization: `Basic ${Buffer.from(`${editorName}:${editorPassword}`).toString('base64')}`,
      };
    });

    apiTest.afterAll(async ({ kbnClient, esClient }) => {
      await Promise.all(createdWorkflowIds.map((id) => workflowsApi.hardDelete(id)));
      await kbnClient.request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` });
      await esClient.security.deleteUser({ username: editorName });
      await esClient.security.deleteRole({ name: editorName });
    });

    apiTest(
      'rejects a step of a private execution the caller cannot access and leaves it resumable',
      async ({ apiClient, kbnClient }) => {
        apiTest.setTimeout(120_000);

        const workflowA = await workflowsApi.create(getHitlYaml('Scout HITL public'));
        const workflowB = await workflowsApi.create(getHitlYaml('Scout HITL private'));
        createdWorkflowIds.push(workflowA.id, workflowB.id);
        await kbnClient.request({
          method: 'PUT',
          path: `/s/${spaceId}/internal/workflows/${workflowB.id}/access_control`,
          body: { access_mode: 'private', entries: [] },
        });

        const [{ workflowExecutionId: executionA }, { workflowExecutionId: executionB }] =
          await Promise.all([
            workflowsApi.run(workflowA.id, {}),
            workflowsApi.run(workflowB.id, {}),
          ]);
        const [pausedA, pausedB] = await Promise.all(
          [executionA, executionB].map((workflowExecutionId) =>
            workflowsApi.waitForStatus({
              workflowExecutionId,
              status: ExecutionStatus.WAITING_FOR_INPUT,
              timeout: WAITING_TIMEOUT,
            })
          )
        );
        const stepA = pausedA.stepExecutions.find((step) => step.stepId === 'ask')?.id ?? '';
        const stepB = pausedB.stepExecutions.find((step) => step.stepId === 'ask')?.id ?? '';
        expect(stepA.length).toBeGreaterThan(0);
        expect(stepB.length).toBeGreaterThan(0);

        const resumePath = (executionId: string) =>
          `s/${spaceId}/api/workflows/executions/${executionId}/resume`;

        // The editor can neither see B nor claim its step through A.
        expect(
          await apiClient.get(`s/${spaceId}/api/workflows/executions/${executionB}`, {
            headers: editorHeaders,
          })
        ).toHaveStatusCode(404);
        expect(
          await apiClient.post(resumePath(executionA), {
            headers: editorHeaders,
            body: { input: { approved: true }, stepExecutionId: stepB },
          })
        ).toHaveStatusCode(409);

        // B was not locked by the rejected attempt, and A still resumes with its own step.
        expect(
          await workflowsApi.rawResume(executionB, { approved: true }, { stepExecutionId: stepB })
        ).toMatchObject({ status: 200 });
        expect(
          await apiClient.post(resumePath(executionA), {
            headers: editorHeaders,
            body: { input: { approved: true }, stepExecutionId: stepA },
          })
        ).toHaveStatusCode(200);

        await Promise.all(
          [executionA, executionB].map((workflowExecutionId) =>
            workflowsApi.waitForStatus({
              workflowExecutionId,
              status: ExecutionStatus.COMPLETED,
              timeout: TERMINAL_TIMEOUT,
            })
          )
        );
      }
    );
  }
);
