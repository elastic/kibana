/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RoleApiCredentials } from '@kbn/scout';
import { apiTest, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { WorkflowsApiService } from '../../../common/apis/workflows';

const WHOAMI_STEP = `
    type: kibana.request
    with:
      method: GET
      path: /internal/security/me
`;

const getChildYaml = (name: string) => `
name: ${name}
enabled: true
description: Sync child that switches identity on waitForApproval
triggers:
  - type: manual

steps:
  - name: child_before
${WHOAMI_STEP}
  - name: hitl
    type: waitForApproval
    timeout: 24h
    with:
      message: "Approve this sub-workflow action?"
      approveLabel: Approve
      rejectLabel: Decline
  - name: child_after
${WHOAMI_STEP}
`;

const getParentYaml = (name: string, childWorkflowId: string) => `
name: ${name}
enabled: true
description: Sync parent that must keep its original identity after the child HITL
triggers:
  - type: manual

steps:
  - name: parent_before
${WHOAMI_STEP}
  - name: run_child
    type: workflow.execute
    with:
      workflow-id: ${childWorkflowId}
  - name: parent_after
${WHOAMI_STEP}
`;

const WAITING_TIMEOUT = 30_000;
const TERMINAL_TIMEOUT = 45_000;

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

const stepById = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined,
  stepId: string
): WorkflowStepExecutionDto | undefined => stepExecutions?.find((step) => step.stepId === stepId);

const childExecutionIdOf = (execution: WorkflowExecutionDto): string | undefined => {
  const executionId = asRecord(stepById(execution.stepExecutions, 'run_child')?.state)?.executionId;
  return typeof executionId === 'string' && executionId.length > 0 ? executionId : undefined;
};

const requireChildExecutionId = (execution: WorkflowExecutionDto): string => {
  const executionId = childExecutionIdOf(execution);
  if (executionId === undefined) {
    throw new Error(`Execution ${execution.id} did not expose a child execution id`);
  }
  return executionId;
};

const hasStepOutputs = (execution: WorkflowExecutionDto, stepIds: readonly string[]): boolean =>
  stepIds.every((stepId) => asRecord(stepById(execution.stepExecutions, stepId)?.output) != null);

const usernameFromWhoamiStep = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined,
  stepId: string
): string => {
  const username = asRecord(stepById(stepExecutions, stepId)?.output)?.username;
  expect(typeof username).toBe('string');
  expect((username as string).length).toBeGreaterThan(0);
  return username as string;
};

apiTest.describe(
  'Sync sub-workflow identity after child HITL approval',
  { tag: tags.deploymentAgnostic },
  () => {
    let workflowsApi: WorkflowsApiService;
    // This suite runs in the shared default space, so teardown must only remove what it created.
    const createdWorkflowIds: string[] = [];

    apiTest.beforeAll(async ({ kbnClient }) => {
      workflowsApi = new WorkflowsApiService('default', kbnClient);
    });

    apiTest.afterAll(async () => {
      await workflowsApi.bulkDelete(createdWorkflowIds);
    });

    apiTest(
      'child continues as the approver while the parent keeps the original runner identity',
      async ({ kbnClient, requestAuth }) => {
        apiTest.setTimeout(90_000);

        const runnerMe = await kbnClient.request<{ username: string }>({
          method: 'GET',
          path: '/internal/security/me',
        });
        const runnerUsername = runnerMe.data.username;
        expect(typeof runnerUsername).toBe('string');
        expect(runnerUsername.length).toBeGreaterThan(0);

        const approver: RoleApiCredentials = await requestAuth.getApiKeyForCustomRole({
          elasticsearch: { cluster: [], indices: [] },
          kibana: [
            {
              base: ['all'],
              feature: {},
              spaces: ['*'],
            },
          ],
        });
        const approverMe = await kbnClient.request<{ username: string }>({
          method: 'GET',
          path: '/internal/security/me',
          headers: { ...approver.apiKeyHeader },
        });
        const approverUsername = approverMe.data.username;
        expect(typeof approverUsername).toBe('string');
        expect(approverUsername.length).toBeGreaterThan(0);
        expect(approverUsername).not.toBe(runnerUsername);

        const child = await workflowsApi.create(getChildYaml(`Scout HITL child ${Date.now()}`));
        createdWorkflowIds.push(child.id);
        const parent = await workflowsApi.create(
          getParentYaml(`Scout HITL parent ${Date.now()}`, child.id)
        );
        createdWorkflowIds.push(parent.id);

        const { workflowExecutionId: parentExecutionId } = await workflowsApi.run(parent.id, {});

        const pausedParent = await workflowsApi.waitForStatus({
          workflowExecutionId: parentExecutionId,
          status: ExecutionStatus.WAITING_FOR_CHILD,
          timeout: WAITING_TIMEOUT,
          until: (execution) => childExecutionIdOf(execution) !== undefined,
        });
        const childExecutionId = requireChildExecutionId(pausedParent);

        const pausedChild = await workflowsApi.waitForStatus({
          workflowExecutionId: childExecutionId,
          status: ExecutionStatus.WAITING_FOR_INPUT,
          timeout: WAITING_TIMEOUT,
          until: (execution) => (stepById(execution.stepExecutions, 'hitl')?.id ?? '').length > 0,
        });
        const hitlStepId = stepById(pausedChild.stepExecutions, 'hitl')?.id ?? '';
        expect(hitlStepId.length).toBeGreaterThan(0);

        const resumeResponse = await workflowsApi.rawResume(
          childExecutionId,
          { approved: true },
          {
            stepExecutionId: hitlStepId,
            headers: { ...approver.apiKeyHeader },
          }
        );
        expect(resumeResponse.status).toBe(200);

        const completedChild = await workflowsApi.waitForStatus({
          workflowExecutionId: childExecutionId,
          status: ExecutionStatus.COMPLETED,
          timeout: TERMINAL_TIMEOUT,
          includeOutput: true,
          until: (execution) => hasStepOutputs(execution, ['child_before', 'child_after', 'hitl']),
        });
        expect(usernameFromWhoamiStep(completedChild.stepExecutions, 'child_before')).toBe(
          runnerUsername
        );
        expect(usernameFromWhoamiStep(completedChild.stepExecutions, 'child_after')).toBe(
          approverUsername
        );
        const hitlOutput = asRecord(stepById(completedChild.stepExecutions, 'hitl')?.output);
        expect(hitlOutput?.respondedBy).toBe(approverUsername);

        const completedParent = await workflowsApi.waitForStatus({
          workflowExecutionId: parentExecutionId,
          status: ExecutionStatus.COMPLETED,
          timeout: TERMINAL_TIMEOUT,
          includeOutput: true,
          until: (execution) => hasStepOutputs(execution, ['parent_before', 'parent_after']),
        });
        expect(usernameFromWhoamiStep(completedParent.stepExecutions, 'parent_before')).toBe(
          runnerUsername
        );
        expect(usernameFromWhoamiStep(completedParent.stepExecutions, 'parent_after')).toBe(
          runnerUsername
        );
      }
    );
  }
);
