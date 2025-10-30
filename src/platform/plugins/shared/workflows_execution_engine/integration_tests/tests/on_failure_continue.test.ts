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

describe('workflow with continue on failure', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe.each(['step level', 'workflow level'])('continue is on %s', (testCase) => {
    let buildYamlFn: () => string;

    beforeAll(() => {
      if (testCase === 'step level') {
        buildYamlFn = () => {
          return `
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      continue: true
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
        };
      } else if (testCase === 'workflow level') {
        buildYamlFn = () => {
          return `
settings:
  on-failure:
    continue: true
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
        };
      }
    });

    describe('when continue is true', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildYamlFn(),
        });
      });

      it('should successfully complete workflow despite error in constantlyFailingStep', async () => {
        const workflowExecutionDoc =
          workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
            'fake_workflow_execution_id'
          );
        expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
        expect(workflowExecutionDoc?.error).toBe(undefined);
        expect(workflowExecutionDoc?.scopeStack).toEqual([]);
      });

      it('should execute constantlyFailingStep once and record its failure', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter(
          (se) =>
            se.stepId === 'constantlyFailingStep' &&
            se.stepType === FakeConnectors.constantlyFailing.actionTypeId
        );
        expect(failingStepExecutions.length).toBe(1);
        expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
        expect(failingStepExecutions[0].error).toBe('Error: Constantly failing connector');
      });

      it('should execute finalStep successfully after the failing step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');
        expect(finalStepExecutions.length).toBe(1);
        expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
        expect(finalStepExecutions[0].error).toBe(undefined);
      });

      it('should execute finalStep after constantlyFailingStep', async () => {
        const failingStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter(
          (se) =>
            se.stepId === 'constantlyFailingStep' &&
            se.stepType === FakeConnectors.constantlyFailing.actionTypeId
        );
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');

        expect(failingStepExecutions.length).toBe(1);
        expect(finalStepExecutions.length).toBe(1);

        const failingStepCompletedAt = new Date(failingStepExecutions[0].completedAt!).getTime();
        const finalStepStartedAt = new Date(finalStepExecutions[0].startedAt).getTime();

        expect(finalStepStartedAt).toBeGreaterThanOrEqual(failingStepCompletedAt);
      });
    });
  });

  describe('when continue is false (default behavior)', () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`,
      });
    });

    it('should fail the workflow due to error in constantlyFailingStep', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecutionDoc?.error).toBe('Error: Constantly failing connector');
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should execute constantlyFailingStep once and record its failure', async () => {
      const failingStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'constantlyFailingStep' &&
          se.stepType === FakeConnectors.constantlyFailing.actionTypeId
      );
      expect(failingStepExecutions.length).toBe(1);
      expect(failingStepExecutions[0].status).toBe(ExecutionStatus.FAILED);
      expect(failingStepExecutions[0].error).toBe('Error: Constantly failing connector');
    });

    it('should not execute finalStep', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(0);
    });
  });
});
