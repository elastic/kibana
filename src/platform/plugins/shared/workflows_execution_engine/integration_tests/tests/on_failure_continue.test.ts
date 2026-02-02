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
    function buildYamlFn(continueExpression: boolean | string | undefined): string {
      if (testCase === 'step level') {
        return `
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    ${continueExpression ? 'on-failure:' : ''}
      ${continueExpression ? `continue: ${continueExpression}` : ''}
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
      }
      return `
settings:
  ${continueExpression ? 'on-failure:' : ''}
    ${continueExpression ? `continue: ${continueExpression}` : ''}
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
    }

    describe.each([true, '${{error.type == "Error"}}'])(
      'when continue is %s',
      (continueTestCase) => {
        beforeEach(async () => {
          jest.clearAllMocks();
          await workflowRunFixture.runWorkflow({
            workflowYaml: buildYamlFn(continueTestCase),
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
          expect(failingStepExecutions[0].error).toEqual({
            message: 'Error: Constantly failing connector',
            type: 'Error',
          });
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

          const failingStepCompletedAt = new Date(failingStepExecutions[0].finishedAt!).getTime();
          const finalStepStartedAt = new Date(finalStepExecutions[0].startedAt).getTime();

          expect(finalStepStartedAt).toBeGreaterThanOrEqual(failingStepCompletedAt);
        });
      }
    );

    describe.each([undefined, false, '${{error.type == "SomeOtherError"}}'])(
      'when continue is "%s"',
      (continueTestCase) => {
        beforeEach(async () => {
          jest.clearAllMocks();
          await workflowRunFixture.runWorkflow({
            workflowYaml: buildYamlFn(continueTestCase),
          });
        });

        it('should fail the workflow due to error in constantlyFailingStep', async () => {
          const workflowExecutionDoc =
            workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
              'fake_workflow_execution_id'
            );
          expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
          expect(workflowExecutionDoc?.error).toEqual({
            message: 'Error: Constantly failing connector',
            type: 'Error',
          });
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
          expect(failingStepExecutions[0].error).toEqual({
            message: 'Error: Constantly failing connector',
            type: 'Error',
          });
        });

        it('should not execute finalStep', async () => {
          const finalStepExecutions = Array.from(
            workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
          ).filter((se) => se.stepId === 'finalStep');
          expect(finalStepExecutions.length).toBe(0);
        });
      }
    );
  });
});
