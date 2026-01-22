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

describe('workflow with waitForInput step', () => {
  const buildYaml = (options: { timeout?: string; message?: string } = {}) => {
    const timeoutConfig = options.timeout ? `timeout: ${options.timeout}` : '';
    const messageConfig = options.message ? `message: "${options.message}"` : '';
    const withBlock =
      timeoutConfig || messageConfig
        ? `with:
        ${timeoutConfig}
        ${messageConfig}`
        : '';

    return `
steps:
  - name: firstConnectorStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'First step message'

  - name: waitForHumanInput
    type: waitForInput
    ${withBlock}

  - name: lastConnectorStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Last step message: {{ steps.waitForHumanInput.output.input.decision }}'
`;
  };

  describe('when workflow hits waitForInput step', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
    });

    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml({ timeout: '30m', message: 'Please approve or reject' }),
      });
    });

    it('should put workflow in waiting_for_input state', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(workflowExecutionDoc?.error).toBe(undefined);
    });

    it('should have correct currentNodeId in workflow execution', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.currentNodeId).toBe('waitForHumanInput');
    });

    it('should execute firstConnectorStep successfully before waiting', async () => {
      const firstStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'firstConnectorStep');
      expect(firstStepExecutions.length).toBe(1);
      expect(firstStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(firstStepExecutions[0].error).toBe(undefined);
    });

    it('should have waitForHumanInput step in waiting_for_input state', async () => {
      const waitStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'waitForHumanInput');
      expect(waitStepExecutions.length).toBe(1);
      expect(waitStepExecutions[0].status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(waitStepExecutions[0].stepType).toBe('waitForInput');
    });

    it('should store waitingForInputSince in step state', async () => {
      const waitStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'waitForHumanInput');
      expect(waitStepExecutions[0].state?.waitingForInputSince).toBeDefined();
      const waitingTime = new Date(waitStepExecutions[0].state?.waitingForInputSince as string);
      expect(waitingTime.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should not execute lastConnectorStep yet', async () => {
      const lastStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'lastConnectorStep');
      expect(lastStepExecutions.length).toBe(0);
    });

    it('should schedule timeout task for waitForInput step', async () => {
      expect(workflowRunFixture.taskManagerMock.schedule).toHaveBeenCalledTimes(1);
      const scheduleCall = (workflowRunFixture.taskManagerMock.schedule as jest.Mock).mock
        .calls[0][0];
      expect(scheduleCall.taskType).toBe('workflow:waitForInput:timeout');
    });

    describe('when human provides input via resume', () => {
      beforeAll(async () => {
        // Simulate human input being provided
        const waitStepExecution = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).find((se) => se.stepId === 'waitForHumanInput');

        if (waitStepExecution) {
          // Update step with human input (simulating what the resume API would do)
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.set(waitStepExecution.id, {
            ...waitStepExecution,
            state: {
              ...waitStepExecution.state,
              humanInput: { decision: 'approved' },
            },
          });
        }

        await workflowRunFixture.resumeWorkflow();
      });

      it('should successfully complete workflow after resume', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBe(undefined);
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should complete waitForHumanInput step with human input in output', async () => {
        const waitStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'waitForHumanInput');
        expect(waitStepExecutions.length).toBe(1);
        expect(waitStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(waitStepExecutions[0].output).toEqual({
          input: { decision: 'approved' },
        });
      });

      it('should execute lastConnectorStep successfully after resume', async () => {
        const lastStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'lastConnectorStep');
        expect(lastStepExecutions.length).toBe(1);
        expect(lastStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(lastStepExecutions[0].error).toBe(undefined);
      });
    });
  });

  describe('when waitForInput has no timeout', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
    });

    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(), // No timeout
      });
    });

    it('should put workflow in waiting_for_input state', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should not schedule timeout task when no timeout configured', async () => {
      // Check that no timeout task was scheduled
      const scheduleCalls = (workflowRunFixture.taskManagerMock.schedule as jest.Mock).mock.calls;
      const timeoutTasks = scheduleCalls.filter(
        (call: any) => call[0]?.taskType === 'workflow:waitForInput:timeout'
      );
      expect(timeoutTasks.length).toBe(0);
    });
  });

  describe('when waitForInput times out', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
    });

    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml({ timeout: '1s' }),
      });
    });

    beforeAll(async () => {
      // Simulate timeout by setting timedOut flag
      const waitStepExecution = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((se) => se.stepId === 'waitForHumanInput');

      if (waitStepExecution) {
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.set(waitStepExecution.id, {
          ...waitStepExecution,
          state: {
            ...waitStepExecution.state,
            timedOut: true,
          },
        });
      }

      await workflowRunFixture.resumeWorkflow();
    });

    it('should complete workflow after timeout', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should complete waitForHumanInput step with timedOut flag in output', async () => {
      const waitStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'waitForHumanInput');
      expect(waitStepExecutions.length).toBe(1);
      expect(waitStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(waitStepExecutions[0].output).toEqual({
        timedOut: true,
      });
    });
  });
});
