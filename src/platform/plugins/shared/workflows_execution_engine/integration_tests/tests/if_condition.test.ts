/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from '@kbn/utility-types';
import { ExecutionStatus } from '@kbn/workflows';
import { FakeConnectors } from '../mocks/actions_plugin.mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow with if condition', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('when condition evaluates to true', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: setupStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Setting up data'

  - name: conditionalStep
    type: if
    condition: steps.setupStep.output.text:"ok"
    steps:
      - name: thenStep
        type: slack
        connector-id: ${FakeConnectors.slack2.name}
        with:
          message: 'Condition was true!'
    else:
      - name: elseStep
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'Condition was false!'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final step executed'
`,
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

    it('should execute setupStep before condition', async () => {
      const setupStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'setupStep');
      expect(setupStepExecutions.length).toBe(1);
      expect(setupStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should execute thenStep when condition is true', async () => {
      const thenStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'thenStep');
      expect(thenStepExecutions.length).toBe(1);
      expect(thenStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect((thenStepExecutions[0].input as JsonObject).message).toBe('Condition was true!');
    });

    it('should not execute elseStep when condition is true', async () => {
      const elseStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'elseStep');
      expect(elseStepExecutions.length).toBe(0);
    });

    it('should execute finalStep after conditional branch', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(1);
      expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should invoke connector for thenStep but not elseStep', async () => {
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FakeConnectors.slack2.id,
          params: {
            message: 'Condition was true!',
          },
        })
      );

      expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            message: 'Condition was false!',
          },
        })
      );
    });
  });

  describe('when condition evaluates to false', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: setupStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Setting up data'

  - name: conditionalStep
    type: if
    condition: steps.setupStep.output.text:"nonexistent"
    steps:
      - name: thenStep
        type: slack
        connector-id: ${FakeConnectors.slack2.name}
        with:
          message: 'Condition was true!'
    else:
      - name: elseStep
        type: slack
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'Condition was false!'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final step executed'
`,
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

    it('should execute setupStep before condition', async () => {
      const setupStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'setupStep');
      expect(setupStepExecutions.length).toBe(1);
      expect(setupStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should not execute thenStep when condition is false', async () => {
      const thenStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'thenStep');
      expect(thenStepExecutions.length).toBe(0);
    });

    it('should execute elseStep when condition is false', async () => {
      const elseStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'elseStep');
      expect(elseStepExecutions.length).toBe(1);
      expect(elseStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect((elseStepExecutions[0].input as JsonObject).message).toBe('Condition was false!');
    });

    it('should execute finalStep after conditional branch', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(1);
      expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should invoke connector for elseStep but not thenStep', async () => {
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: FakeConnectors.slack1.id,
          params: {
            message: 'Condition was false!',
          },
        })
      );

      expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            message: 'Condition was true!',
          },
        })
      );
    });
  });

  describe('when condition is false and no else branch provided', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: setupStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Setting up data'

  - name: conditionalStep
    type: if
    condition: steps.setupStep.output.text:"nonexistent"
    steps:
      - name: thenStep
        type: slack
        connector-id: ${FakeConnectors.slack2.name}
        with:
          message: 'Condition was true!'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final step executed'
`,
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

    it('should execute setupStep before condition', async () => {
      const setupStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'setupStep');
      expect(setupStepExecutions.length).toBe(1);
      expect(setupStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should not execute thenStep when condition is false', async () => {
      const thenStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'thenStep');
      expect(thenStepExecutions.length).toBe(0);
    });

    it('should execute finalStep even when no branch executed', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(1);
      expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should not invoke thenStep connector', async () => {
      expect(workflowRunFixture.unsecuredActionsClientMock.execute).not.toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            message: 'Condition was true!',
          },
        })
      );
    });

    it('should only execute setupStep and finalStep connectors', async () => {
      const executeCalls = workflowRunFixture.unsecuredActionsClientMock.execute.mock.calls;
      // setupStep + finalStep = 2 calls
      expect(executeCalls.length).toBe(2);
    });
  });

  describe('nested if conditions', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: setupStep
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'Setting up data'

  - name: outerCondition
    type: if
    condition: steps.setupStep.output.text:"ok"
    steps:
      - name: outerThenStep
        type: slack
        connector-id: ${FakeConnectors.slack2.name}
        with:
          message: 'Outer condition was true!'
      
      - name: innerCondition
        type: if
        condition: steps.outerThenStep.output.text:"ok"
        steps:
          - name: innerThenStep
            type: slack
            connector-id: ${FakeConnectors.slack1.name}
            with:
              message: 'Inner condition was true!'
        else:
          - name: innerElseStep
            type: slack
            connector-id: ${FakeConnectors.slack2.name}
            with:
              message: 'Inner condition was false!'
`,
      });
    });

    it('should successfully complete workflow with nested conditions', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
    });

    it('should execute outer then branch', async () => {
      const outerThenStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'outerThenStep');
      expect(outerThenStepExecutions.length).toBe(1);
      expect(outerThenStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should execute inner then branch when nested condition is true', async () => {
      const innerThenStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'innerThenStep');
      expect(innerThenStepExecutions.length).toBe(1);
      expect(innerThenStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should not execute inner else branch when nested condition is true', async () => {
      const innerElseStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'innerElseStep');
      expect(innerElseStepExecutions.length).toBe(0);
    });
  });
});
