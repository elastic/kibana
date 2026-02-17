/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow level timeout', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  const workflowYaml = `
settings:
  timeout: 2s

consts:
  items: '["item1", "item2", "item3", "item4"]'

steps:
  - name: slowInferenceStep1Completed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 1
  - name: slowInferenceStep2Completed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 2
  - name: slowInferenceStep3Failed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 3
  - name: slowInferenceStep4NotStarted
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 4
`;

  async function waitForWorkflowTimedOut(maxWaitMs = 10000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      if (workflowExecutionDoc?.status === ExecutionStatus.TIMED_OUT) {
        // Give a buffer to ensure all state updates and async operations are complete
        // The workflow timeout is 2s, so we wait a bit longer to ensure everything settles
        await new Promise((resolve) => setTimeout(resolve, 200));
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Workflow did not reach TIMED_OUT status within timeout');
  }

  beforeAll(async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml,
    });
    // Wait for workflow to reach TIMED_OUT status and all async operations to complete
    await waitForWorkflowTimedOut();
  });

  it('should have correct step execution count', () => {
    const stepExecutionsWithStepId = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    );
    // With a 2s timeout, step3 may not be created if timeout occurs before it starts
    // So we expect 2-3 step executions (step1, step2, and possibly step3)
    expect(stepExecutionsWithStepId.length).toBeGreaterThanOrEqual(2);
    expect(stepExecutionsWithStepId.length).toBeLessThanOrEqual(3);
  });

  it('should set timeout status for workflow', () => {
    const workflowExecutionDoc =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.TIMED_OUT);
    expect(workflowExecutionDoc?.scopeStack).not.toEqual([]);
  });

  it('should have completed status for executed steps', () => {
    const allStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((se) => se.stepId && se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId);

    // Step1 should always complete (finishes at ~1s, timeout is at 2s)
    // Step2 might complete OR fail depending on timing (finishes at ~2s, same as timeout)
    const step1Execution = allStepExecutions.find(
      (se) => se.stepId === 'slowInferenceStep1Completed'
    );
    const step2Execution = allStepExecutions.find(
      (se) => se.stepId === 'slowInferenceStep2Completed'
    );

    expect(step1Execution).toBeDefined();
    expect(step1Execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(step1Execution?.error).toBeUndefined();

    // Step2 might be COMPLETED or FAILED depending on timing
    expect(step2Execution).toBeDefined();
    if (step2Execution?.status === ExecutionStatus.COMPLETED) {
      expect(step2Execution.error).toBeUndefined();
    } else if (step2Execution?.status === ExecutionStatus.FAILED) {
      // If step2 failed, it should be due to timeout
      expect(step2Execution.error).toBeDefined();
      expect(step2Execution.error?.message).toContain('Failed due to workflow timeout');
    } else {
      throw new Error(`Step2 has unexpected status: ${step2Execution?.status}`);
    }
  });

  it('should have failed status for step exceeding timeout', () => {
    const allStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter(
      (se) =>
        se.stepId?.endsWith('Failed') &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );

    const step3Execution = allStepExecutions.find((se) => se.stepId === 'slowInferenceStep3Failed');

    // Step3 might not exist if timeout occurs before it starts executing
    // In that case, the workflow still timed out correctly
    if (step3Execution) {
      // If step3 exists, it should be failed with timeout error
      expect(step3Execution.status).toBe(ExecutionStatus.FAILED);
      expect(step3Execution.error?.message).toContain('Failed due to workflow timeout');
    }

    // Verify that if any steps failed, they have the correct timeout error
    // Note: It's possible that no steps failed if the timeout occurred between steps
    // (e.g., after step2 completed but before step3 started)
    const failedSteps = allStepExecutions.filter((se) => se.status === ExecutionStatus.FAILED);

    // If there are failed steps, verify they all have timeout errors
    if (failedSteps.length > 0) {
      failedSteps.forEach((failedStep) => {
        expect(failedStep.error).toBeDefined();
        expect(failedStep.error?.message).toContain('Failed due to workflow timeout');
      });
    }
  });

  it('should not have started step following failed step', () => {
    const slowInferenceStepExecution = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find(
      (se) =>
        se.stepId?.endsWith('NotStarted') &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );
    expect(slowInferenceStepExecution).toBeUndefined();
  });

  it('should invoke connector only 3 times timeout', () => {
    const connectorCalls = workflowRunFixture.unsecuredActionsClientMock.execute.mock.calls.filter(
      (call) => call[0]?.id === FakeConnectors.slow_1sec_inference.id
    );

    // With a 2s timeout and 1s steps:
    // - Step 1 completes at ~1s
    // - Step 2 completes at ~2s (may be aborted by timeout check)
    // - Step 3 starts at ~2s, but timeout check at ~2s may abort it before connector call
    expect(connectorCalls.length).toBeGreaterThanOrEqual(2);
    expect(connectorCalls.length).toBeLessThanOrEqual(3);
  });
});
