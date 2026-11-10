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
import { ExecutionStatus } from '@kbn/workflows/types/latest';
import { spaceTest } from '../../fixtures';

const DEBUGGER_MOCK_WORKFLOW_YAML = `
name: Scout Debugger Mocks Workflow
enabled: true
triggers:
  - type: manual
    inputs:
      properties:
        userId:
          type: string
steps:
  - name: fetch_user
    type: http
    with:
      url: https://nonexistent.invalid/users/{{ inputs.userId }}
      method: GET
    mock:
      output:
        status: 200
        data:
          userId: "{{ inputs.userId }}"
          role: "admin"
  - name: risky_action
    type: http
    with:
      url: https://nonexistent.invalid/action
      method: POST
    on-failure:
      continue: true
      fallback:
        - name: fallback_log
          type: console
          with:
            message: "Recovered from {{ steps.risky_action.error.type }}: {{ steps.risky_action.error.message }}"
    mock:
      error:
        type: "SimulatedHttpError"
        message: "Failed for role {{ steps.fetch_user.output.data.role }}"
  - name: final_summary
    type: console
    with:
      message: "Done for {{ steps.fetch_user.output.data.userId }} ({{ steps.fallback_log.output }})"
`;

const DEBUGGER_BREAKPOINT_WORKFLOW_YAML = `
name: Scout Debugger Breakpoint Workflow
enabled: true
triggers:
  - type: manual
steps:
  - name: step_one
    type: console
    with:
      message: "Preparing payload"
    mock:
      output: "mocked-payload-123"
  - name: step_two
    type: console
    with:
      message: "Received: {{ steps.step_one.output }}"
`;

const TIMEOUT_MS = 30_000;

spaceTest.describe(
  'Workflow debugger (mocks and breakpoints)',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.afterAll(async ({ apiServices }) => {
      await apiServices.workflowsApi.deleteAll();
    });

    spaceTest(
      'executes mocked step outputs and errors with Liquid templating and on-failure fallback when debug is enabled',
      async ({ apiServices }) => {
        const { workflowsApi } = apiServices;

        const { workflowExecutionId } = await workflowsApi.test({
          workflowYaml: DEBUGGER_MOCK_WORKFLOW_YAML,
          inputs: { userId: 'alice-42' },
          debug: { enabled: true },
        });

        const completed = await workflowsApi.waitForStatus({
          workflowExecutionId,
          status: ExecutionStatus.COMPLETED,
          timeout: TIMEOUT_MS,
          includeOutput: true,
          until: (exec) =>
            exec.stepExecutions?.some(
              (s) => s.stepId === 'final_summary' && s.status === ExecutionStatus.COMPLETED
            ) ?? false,
        });

        const fetchUserStep = completed.stepExecutions.find((s) => s.stepId === 'fetch_user');
        expect(fetchUserStep?.status).toBe(ExecutionStatus.COMPLETED);
        expect(fetchUserStep?.output).toStrictEqual({
          status: 200,
          data: {
            userId: 'alice-42',
            role: 'admin',
          },
        });

        const riskyActionStep = completed.stepExecutions.find((s) => s.stepId === 'risky_action');
        expect(riskyActionStep?.status).toBe(ExecutionStatus.FAILED);
        expect(riskyActionStep?.error).toMatchObject({
          type: 'SimulatedHttpError',
          message: 'Failed for role admin',
        });

        const fallbackStep = completed.stepExecutions.find((s) => s.stepId === 'fallback_log');
        expect(fallbackStep?.status).toBe(ExecutionStatus.COMPLETED);
        expect(fallbackStep?.output).toBe(
          'Recovered from SimulatedHttpError: Failed for role admin'
        );

        const finalStep = completed.stepExecutions.find((s) => s.stepId === 'final_summary');
        expect(finalStep?.status).toBe(ExecutionStatus.COMPLETED);
        expect(finalStep?.output).toBe(
          'Done for alice-42 (Recovered from SimulatedHttpError: Failed for role admin)'
        );
      }
    );

    spaceTest(
      'pauses before a breakpointed step with resolved input and resumes to completion',
      async ({ apiServices }) => {
        const { workflowsApi } = apiServices;

        const { workflowExecutionId } = await workflowsApi.test({
          workflowYaml: DEBUGGER_BREAKPOINT_WORKFLOW_YAML,
          inputs: {},
          debug: {
            enabled: true,
            breakpoints: ['step_two'],
          },
        });

        const paused = await workflowsApi.waitForStatus({
          workflowExecutionId,
          status: ExecutionStatus.WAITING_FOR_INPUT,
          timeout: TIMEOUT_MS,
          includeOutput: true,
          until: (exec) =>
            exec.stepExecutions?.some(
              (s) => s.stepId === 'step_two' && s.status === ExecutionStatus.WAITING_FOR_INPUT
            ) ?? false,
        });

        const stepOne = paused.stepExecutions.find((s) => s.stepId === 'step_one');
        expect(stepOne?.status).toBe(ExecutionStatus.COMPLETED);
        expect(stepOne?.output).toBe('mocked-payload-123');

        const stepTwoPaused = paused.stepExecutions.find((s) => s.stepId === 'step_two');
        expect(stepTwoPaused?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
        expect(stepTwoPaused?.state).toMatchObject({
          breakpointPaused: true,
          breakpointHit: true,
        });

        const resumeResponse = await workflowsApi.rawResume(
          workflowExecutionId,
          {},
          { stepExecutionId: stepTwoPaused?.id }
        );
        expect(resumeResponse.status).toBe(200);

        const completed = await workflowsApi.waitForStatus({
          workflowExecutionId,
          status: ExecutionStatus.COMPLETED,
          timeout: TIMEOUT_MS,
          includeOutput: true,
          until: (exec) =>
            exec.stepExecutions?.some(
              (s) => s.stepId === 'step_two' && s.status === ExecutionStatus.COMPLETED
            ) ?? false,
        });

        const stepTwoCompleted = completed.stepExecutions.find((s) => s.stepId === 'step_two');
        expect(stepTwoCompleted?.status).toBe(ExecutionStatus.COMPLETED);
        expect(stepTwoCompleted?.output).toBe('Received: mocked-payload-123');
      }
    );
  }
);
