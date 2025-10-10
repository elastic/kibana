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

describe('workflow with continue on failure', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('step-level continue behavior', () => {
    function buildStepLevelContinueYaml(continueValue: boolean) {
      return `
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      continue: ${continueValue}
    with:
      message: 'This step will fail'
  - name: nextStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'This step should execute if continue is true'
  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final step'
`;
    }

    describe('when continue is true', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildStepLevelContinueYaml(true),
        });
      });

      it('should complete the workflow successfully despite step failure', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBe(undefined);
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute the failing step and mark it as failed', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'failingStep');

        expect(failingStepExecutions.length).toBe(1);
        expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
        expect(failingStepExecutions[0].error).toContain('Error: Constantly failing connector');
      });

      it('should execute the next step after the failing step', async () => {
        const nextStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'nextStep');

        expect(nextStepExecutions.length).toBe(1);
        expect(nextStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(nextStepExecutions[0].error).toBe(undefined);
      });

      it('should execute the final step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');

        expect(finalStepExecutions.length).toBe(1);
        expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(finalStepExecutions[0].error).toBe(undefined);
      });
    });

    describe('when continue is false', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildStepLevelContinueYaml(false),
        });
      });

      it('should fail the workflow due to step failure', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
        expect(workflowExecutionDoc?.error).toContain('Error: Constantly failing connector');
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute the failing step and mark it as failed', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'failingStep');

        expect(failingStepExecutions.length).toBe(1);
        expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
        expect(failingStepExecutions[0].error).toContain('Error: Constantly failing connector');
      });

      it('should not execute the next step after the failing step', async () => {
        const nextStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'nextStep');

        expect(nextStepExecutions.length).toBe(0);
      });

      it('should not execute the final step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');

        expect(finalStepExecutions.length).toBe(0);
      });
    });
  });

  describe('workflow-level continue behavior', () => {
    function buildWorkflowLevelContinueYaml(continueValue: boolean) {
      return `
settings:
  on-failure:
    continue: ${continueValue}
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    with:
      message: 'This step will fail'
  - name: nextStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'This step should execute if continue is true'
  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final step'
`;
    }

    describe('when workflow-level continue is true', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildWorkflowLevelContinueYaml(true),
        });
      });

      it('should complete the workflow successfully despite step failure', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBe(undefined);
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute the failing step and mark it as failed', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'failingStep');

        expect(failingStepExecutions.length).toBe(1);
        expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
        expect(failingStepExecutions[0].error).toContain('Error: Constantly failing connector');
      });

      it('should execute the next step after the failing step', async () => {
        const nextStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'nextStep');

        expect(nextStepExecutions.length).toBe(1);
        expect(nextStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(nextStepExecutions[0].error).toBe(undefined);
      });

      it('should execute the final step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');

        expect(finalStepExecutions.length).toBe(1);
        expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(finalStepExecutions[0].error).toBe(undefined);
      });
    });

    describe('when workflow-level continue is false', () => {
      beforeEach(async () => {
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildWorkflowLevelContinueYaml(false),
        });
      });

      it('should fail the workflow due to step failure', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
        expect(workflowExecutionDoc?.error).toContain('Error: Constantly failing connector');
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute the failing step and mark it as failed', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'failingStep');

        expect(failingStepExecutions.length).toBe(1);
        expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
        expect(failingStepExecutions[0].error).toContain('Error: Constantly failing connector');
      });

      it('should not execute the next step after the failing step', async () => {
        const nextStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'nextStep');

        expect(nextStepExecutions.length).toBe(0);
      });

      it('should not execute the final step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');

        expect(finalStepExecutions.length).toBe(0);
      });
    });
  });

  describe('step-level continue overrides workflow-level continue', () => {
    function buildOverrideYaml() {
      return `
on-failure:
  continue: false
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      continue: true
    with:
      message: 'This step will fail but should continue due to step-level override'
  - name: nextStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'This step should execute due to step-level continue override'
`;
    }

    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildOverrideYaml(),
      });
    });

    it('should complete the workflow successfully despite workflow-level continue being false', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should execute the next step due to step-level continue override', async () => {
      const nextStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'nextStep');

      expect(nextStepExecutions.length).toBe(1);
      expect(nextStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(nextStepExecutions[0].error).toBe(undefined);
    });
  });
});
