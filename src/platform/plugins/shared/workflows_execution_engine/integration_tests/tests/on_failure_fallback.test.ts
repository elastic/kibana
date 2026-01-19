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

describe('workflow with fallback on failure', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe.each(['step level', 'workflow level'])('fallback is on %s', (testCase) => {
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
      fallback:
        - name: fallbackStep
          type: ${FakeConnectors.slack1.actionTypeId}
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback message executed'
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: ${FakeConnectors.slack2.actionTypeId}
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
    fallback:
      - name: fallbackStep
        type: ${FakeConnectors.slack1.actionTypeId}
        connector-id: ${FakeConnectors.slack1.name}
        with:
          message: 'Fallback message executed'
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    with:
      message: 'Hi there! Are you alive?'

  - name: finalStep
    type: ${FakeConnectors.slack2.actionTypeId}
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
        };
      }
    });

    describe('when fallback is configured', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await workflowRunFixture.runWorkflow({
          workflowYaml: buildYamlFn(),
        });
      });

      it('should fail the workflow despite fallback step execution', async () => {
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

      // Note: Fallback steps are currently not executed when a step fails without retry
      // This is a known limitation and will be addressed in the future
      // The following tests document the current behavior
      it('should execute fallback step', async () => {
        const fallbackStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepType === 'fallback');

        // Currently, fallback is not executed without retry
        expect(fallbackStepExecutions.length).toBe(1);
      });

      it('should not execute finalStep after failing step', async () => {
        const finalStepExecutions = Array.from(
          workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
        ).filter((se) => se.stepId === 'finalStep');
        expect(finalStepExecutions.length).toBe(0);
      });
    });
  });
});
