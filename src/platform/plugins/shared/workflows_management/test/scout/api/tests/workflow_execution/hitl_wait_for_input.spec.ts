/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import type { WorkflowStepExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { spaceTest } from '../../fixtures';

const HITL_WORKFLOW_YAML = `
name: Scout HITL waitForInput
enabled: true
description: Pauses for human input so Scout can exercise HITL resume
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
          source:
            type: string
        required:
          - approved
  - name: log_decision
    type: console
    with:
      message: "Decision: {{ steps.ask.output.response.approved }}"
`;

const WAITING_TIMEOUT = 30_000;
const TERMINAL_TIMEOUT = 30_000;

const findAskStep = (
  stepExecutions: WorkflowStepExecutionDto[] | undefined
): WorkflowStepExecutionDto | undefined => stepExecutions?.find((step) => step.stepId === 'ask');

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
};

const expectNonEmptyString = (value: unknown): void => {
  expect(typeof value).toBe('string');
  expect((value as string).length).toBeGreaterThan(0);
};

const expectAskStepAccepted = (
  askStep: WorkflowStepExecutionDto | undefined,
  response: { approved: boolean; source: string }
): void => {
  expect(askStep?.status).toBe(ExecutionStatus.COMPLETED);
  const output = asRecord(askStep?.output);
  expect(asRecord(output?.response)).toStrictEqual(response);
  expectNonEmptyString(output?.respondedBy);
};

spaceTest.describe('HITL waitForInput resume', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.afterAll(async ({ apiServices }) => {
    await apiServices.workflowsApi.deleteAll();
  });

  spaceTest(
    'pauses for input and completes with the submitted response',
    async ({ apiServices }) => {
      const { workflowsApi } = apiServices;
      const workflow = await workflowsApi.create(HITL_WORKFLOW_YAML);
      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

      const paused = await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.WAITING_FOR_INPUT,
        timeout: WAITING_TIMEOUT,
      });
      expect(findAskStep(paused.stepExecutions)?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

      const resumeResponse = await workflowsApi.rawResume(workflowExecutionId, {
        approved: true,
        source: 'happy-path',
      });
      expect(resumeResponse.status).toBe(200);
      expect(resumeResponse.data).toMatchObject({
        success: true,
        executionId: workflowExecutionId,
      });

      const completed = await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.COMPLETED,
        timeout: TERMINAL_TIMEOUT,
        includeOutput: true,
      });
      expectAskStepAccepted(findAskStep(completed.stepExecutions), {
        approved: true,
        source: 'happy-path',
      });

      const lateResume = await workflowsApi.rawResume(
        workflowExecutionId,
        { approved: false, source: 'too-late' },
        { ignoreErrors: [409] }
      );
      expect(lateResume.status).toBe(409);
    }
  );

  spaceTest(
    'only one of two concurrent responders claims the waiting step',
    async ({ apiServices }) => {
      const { workflowsApi } = apiServices;
      const workflow = await workflowsApi.create(HITL_WORKFLOW_YAML);
      const { workflowExecutionId } = await workflowsApi.run(workflow.id, {});

      await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.WAITING_FOR_INPUT,
        timeout: WAITING_TIMEOUT,
      });

      const firstInput = { approved: true, source: 'consumer-a' };
      const secondInput = { approved: false, source: 'consumer-b' };
      // The loser may 409 (claim lost) or 500 (resume task already scheduled).
      const resumeOptions = { ignoreErrors: [409, 500], retries: 0 };

      const [firstResume, secondResume] = await Promise.all([
        workflowsApi.rawResume(workflowExecutionId, firstInput, resumeOptions),
        workflowsApi.rawResume(workflowExecutionId, secondInput, resumeOptions),
      ]);

      const accepted = [
        { input: firstInput, status: firstResume.status },
        { input: secondInput, status: secondResume.status },
      ].filter((result) => result.status === 200);
      expect(accepted.length).toBeGreaterThan(0);
      expect(accepted.length).toBeLessThan(2);

      const loser = firstResume.status === 200 ? secondResume : firstResume;
      expect([409, 500]).toContain(loser.status);

      const completed = await workflowsApi.waitForStatus({
        workflowExecutionId,
        status: ExecutionStatus.COMPLETED,
        timeout: TERMINAL_TIMEOUT,
        includeOutput: true,
      });
      const askStep = findAskStep(completed.stepExecutions);
      const appliedResponse = asRecord(asRecord(askStep?.output)?.response);
      const winnerInput = [firstInput, secondInput].find(
        (input) =>
          input.source === appliedResponse?.source && input.approved === appliedResponse?.approved
      );
      expect(winnerInput).toBeDefined();
      expectAskStepAccepted(askStep, winnerInput ?? firstInput);
    }
  );
});
