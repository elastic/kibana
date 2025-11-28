/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server/task';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow with wait step', () => {
  let duration: string;

  const buildYaml = () => {
    return `
steps:
  - name: firstConnectorStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'First step message'

  - name: waitStep
    type: wait
    with:
      duration: ${duration}

  - name: lastConnectorStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Last step message'
`;
  };

  describe('when duration is short', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
    });
    beforeAll(async () => {
      duration = '2s';
    });

    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
      });
    });

    it('should successfully complete workflow', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should execute firstConnectorStep successfully', async () => {
      const firstStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'firstConnectorStep');
      expect(firstStepExecutions.length).toBe(1);
      expect(firstStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(firstStepExecutions[0].error).toBe(undefined);
    });

    it('should execute waitStep successfully', async () => {
      const waitStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'waitStep');
      expect(waitStepExecutions.length).toBe(1);
      expect(waitStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(waitStepExecutions[0].error).toBe(undefined);
      expect(waitStepExecutions[0].stepType).toBe('wait');
    });

    it('should execute lastConnectorStep successfully', async () => {
      const lastStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'lastConnectorStep');
      expect(lastStepExecutions.length).toBe(1);
      expect(lastStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(lastStepExecutions[0].error).toBe(undefined);
    });

    it('should execute steps in correct order', async () => {
      const allStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

      expect(allStepExecutions.length).toBe(3);
      expect(allStepExecutions[0].stepId).toBe('firstConnectorStep');
      expect(allStepExecutions[1].stepId).toBe('waitStep');
      expect(allStepExecutions[2].stepId).toBe('lastConnectorStep');
    });

    it('should have correct workflow duration', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      // Duration should be at least 2s (the wait duration)
      expect(workflowExecutionDoc?.duration).toBeGreaterThanOrEqual(1999);
      // But less than 5s to ensure it's using short duration handler
      expect(workflowExecutionDoc?.duration).toBeLessThan(2100);
    });

    it('should wait for the specified duration between firstConnectorStep and lastConnectorStep', async () => {
      const waitStepExecution = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((se) => se.stepId === 'waitStep');

      const lastStepExecution = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).find((se) => se.stepId === 'lastConnectorStep');

      expect(waitStepExecution).toBeDefined();
      expect(lastStepExecution).toBeDefined();

      const waitStepStartTime = new Date(waitStepExecution!.startedAt).getTime();
      const waitStepEndTime = new Date(waitStepExecution!.finishedAt!).getTime();
      const lastStepStartTime = new Date(lastStepExecution!.startedAt).getTime();

      // Wait step execution time should be at least 2s
      const waitStepExecutionTime = waitStepEndTime - waitStepStartTime;
      expect(waitStepExecutionTime).toBeGreaterThanOrEqual(2000);

      // Last step should start after wait step completes
      expect(lastStepStartTime).toBeGreaterThanOrEqual(waitStepEndTime);
    });

    it('should not create resume task for short duration', async () => {
      expect(workflowRunFixture.taskManagerMock.schedule).not.toHaveBeenCalled();
    });
  });

  describe('when duration is long', () => {
    let workflowRunFixture: WorkflowRunFixture;

    beforeAll(async () => {
      workflowRunFixture = new WorkflowRunFixture();
    });

    beforeAll(async () => {
      duration = '20m';
    });

    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
      });
    });

    it('should put workflow in waiting state', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.WAITING);
      expect(workflowExecutionDoc?.error).toBe(undefined);
    });

    it('should have correct currentNodeId in workflow execution', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.currentNodeId).toBe('waitStep');
    });

    it('should execute firstConnectorStep successfully before waiting', async () => {
      const firstStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'firstConnectorStep');
      expect(firstStepExecutions.length).toBe(1);
      expect(firstStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(firstStepExecutions[0].error).toBe(undefined);
    });

    it('should have waitStep in waiting state', async () => {
      const waitStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'waitStep');
      expect(waitStepExecutions.length).toBe(1);
      expect(waitStepExecutions[0].status).toBe(ExecutionStatus.WAITING);
      expect(waitStepExecutions[0].stepType).toBe('wait');
    });

    it('should not execute lastConnectorStep yet', async () => {
      const lastStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'lastConnectorStep');
      expect(lastStepExecutions.length).toBe(0);
    });

    it('should create resume task with correct parameters', async () => {
      expect(workflowRunFixture.taskManagerMock.schedule).toHaveBeenCalledTimes(1);
      const scheduleCalls = (workflowRunFixture.taskManagerMock.schedule as jest.Mock).mock.calls;
      expect(scheduleCalls).toHaveLength(1);

      const scheduleCall = scheduleCalls[0][0] as ConcreteTaskInstance;
      expect(scheduleCall).toEqual(
        expect.objectContaining({
          taskType: 'workflow:resume',
          params: expect.objectContaining({
            workflowRunId: 'fake_workflow_execution_id',
            spaceId: 'fake_space_id',
          }),
        })
      );

      // Check that nextRunAt is within expected boundaries (20 minutes from now)
      const nextRunAt = new Date(scheduleCall.runAt);
      const now = new Date();
      const expectedMinTime = new Date(now.getTime() + 19.9 * 60 * 1000); // 19.9 minutes
      const expectedMaxTime = new Date(now.getTime() + 20.1 * 60 * 1000); // 20.1 minutes

      expect(nextRunAt.getTime()).toBeGreaterThan(expectedMinTime.getTime());
      expect(nextRunAt.getTime()).toBeLessThan(expectedMaxTime.getTime());
    });

    it('should have workflow finish time undefined when waiting', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.finishedAt).toBeUndefined();
      expect(workflowExecutionDoc?.duration).toBeUndefined();
    });

    describe('should resume and complete workflow after wait', () => {
      beforeAll(async () => {
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
});
