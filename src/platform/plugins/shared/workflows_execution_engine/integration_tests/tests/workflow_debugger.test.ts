/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow debugger (mocks and breakpoints)', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  it('uses step mock.output and mock.error (with Liquid rendering and on-failure fallback) when debug is enabled', async () => {
    await workflowRunFixture.runWorkflow({
      isTestRun: true,
      inputs: { userId: 'user-99' },
      debug: { enabled: true },
      workflowYaml: `
steps:
  - name: mocked_slack
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Hello {{ inputs.userId }}"
    mock:
      output:
        status: "mocked-ok"
        user: "{{ inputs.userId }}"

  - name: mocked_failure
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Should fail via mock"
    on-failure:
      continue: true
      fallback:
        - name: fallback_step
          type: console
          with:
            message: "Fallback caught {{ steps.mocked_failure.error.type }}: {{ steps.mocked_failure.error.message }}"
    mock:
      error:
        type: "SimulatedSlackError"
        message: "Simulated failure for {{ steps.mocked_slack.output.user }}"

  - name: final_step
    type: console
    with:
      message: "{{ steps.mocked_slack.output.status }} -> {{ steps.fallback_step.output }}"
`,
    });

    const execution = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    expect(execution?.status).toBe(ExecutionStatus.COMPLETED);

    // Neither mocked slack step should have invoked the real connector
    expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalled();

    const stepExecs = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    );
    const mockedSlack = stepExecs.find((s) => s.stepId === 'mocked_slack');
    expect(mockedSlack?.status).toBe(ExecutionStatus.COMPLETED);
    expect(mockedSlack?.input).toEqual({ message: 'Hello user-99' });
    expect(mockedSlack?.output).toEqual({
      status: 'mocked-ok',
      user: 'user-99',
    });

    const mockedFailure = stepExecs.find((s) => s.stepId === 'mocked_failure');
    expect(mockedFailure?.status).toBe(ExecutionStatus.FAILED);
    expect(mockedFailure?.error).toEqual({
      type: 'SimulatedSlackError',
      message: 'Simulated failure for user-99',
    });

    const finalStep = stepExecs.find((s) => s.stepId === 'final_step');
    expect(finalStep?.status).toBe(ExecutionStatus.COMPLETED);
    expect(finalStep?.output).toBe(
      'mocked-ok -> Fallback caught SimulatedSlackError: Simulated failure for user-99'
    );
  });

  it('ignores step mocks when debug is not enabled', async () => {
    await workflowRunFixture.runWorkflow({
      isTestRun: true,
      inputs: { userId: 'user-99' },
      workflowYaml: `
steps:
  - name: real_slack
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Real run"
    mock:
      output:
        status: "mocked-should-not-be-used"
`,
    });

    expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledTimes(1);
    const stepExec = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((s) => s.stepId === 'real_slack');
    expect(stepExec?.output).not.toEqual({ status: 'mocked-should-not-be-used' });
  });

  it('pauses at a breakpoint after resolving step input and resumes to completion', async () => {
    await workflowRunFixture.runWorkflow({
      isTestRun: true,
      debug: {
        enabled: true,
        breakpoints: ['step_two'],
      },
      workflowYaml: `
steps:
  - name: step_one
    type: console
    with:
      message: "first"
    mock:
      output: "from-step-one"

  - name: step_two
    type: console
    with:
      message: "second: {{ steps.step_one.output }}"
`,
    });

    const pausedExecution =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(pausedExecution?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

    const stepExecsWhenPaused = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    );
    const stepTwoPaused = stepExecsWhenPaused.find((s) => s.stepId === 'step_two');
    expect(stepTwoPaused?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    expect(stepTwoPaused?.input).toEqual({ message: 'second: from-step-one' });
    expect(stepTwoPaused?.state).toEqual({
      breakpointPaused: true,
      breakpointHit: true,
    });

    // Simulate resume input arrival and resume execution
    if (pausedExecution) {
      pausedExecution.context = {
        ...pausedExecution.context,
        resumeInput: {},
      };
    }
    await workflowRunFixture.resumeWorkflow();

    const completedExecution =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(completedExecution?.status).toBe(ExecutionStatus.COMPLETED);

    const stepTwoCompleted = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find((s) => s.stepId === 'step_two');
    expect(stepTwoCompleted?.status).toBe(ExecutionStatus.COMPLETED);
    expect(stepTwoCompleted?.output).toBe('second: from-step-one');
    expect(stepTwoCompleted?.state).toEqual({
      breakpointPaused: false,
      breakpointHit: true,
    });
  });
});
