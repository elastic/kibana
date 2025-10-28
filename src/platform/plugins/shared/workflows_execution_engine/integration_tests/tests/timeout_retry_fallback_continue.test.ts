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

describe('workflow with timeout, retry, fallback and continue in a step', () => {
  let workflowRunFixture: WorkflowRunFixture;
  let continueExecution: boolean;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  function buildYaml() {
    return `
steps:
  - name: failingStepByTimeout
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    on-failure:
      continue: ${continueExecution}
      retry:
        max-attempts: 1
      fallback:
        - name: fallbackStep
          type: slack
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback message: {{steps.innerForeachChildConnectorStep.result}}'
    with:
      message: 'Hi there! Are you alive?'
  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`;
  }

  describe('when continue is true', () => {
    beforeAll(async () => {
      continueExecution = true;
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
      });
    });

    it('should successfully execute workflow despite errors in constantlyFailingStep', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecutionDoc?.error).toBe(undefined);
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should execute final step', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(1);
      expect(finalStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(finalStepExecutions[0].error).toBe(undefined);
    });

    it('should execute failingStepByTimeout twice (1 initial + 1 retry)', async () => {
      const failingStepByTimeoutExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'failingStepByTimeout' &&
          se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
      );
      expect(failingStepByTimeoutExecutions.length).toBe(2);
    });

    it('should set timeout error for each execution of failingStepByTimeout', async () => {
      const failingStepByTimeoutExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'failingStepByTimeout' &&
          se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
      );
      failingStepByTimeoutExecutions.forEach((se) => {
        expect(se.status).toBe(ExecutionStatus.FAILED);
        expect(se.error).toBe(
          'Error: TimeoutError: Step execution exceeded the configured timeout of 2s.'
        );
      });
    });

    it('should execute fallback step once', async () => {
      const fallbackStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'fallbackStep');
      expect(fallbackStepExecutions.length).toBe(1);
      expect(fallbackStepExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(fallbackStepExecutions[0].error).toBe(undefined);
    });
  });

  describe('when continue is false', () => {
    beforeAll(async () => {
      continueExecution = false;
      await workflowRunFixture.runWorkflow({
        workflowYaml: buildYaml(),
      });
    });

    it('should fail the workflow due to error in failingStepByTimeout', async () => {
      const workflowExecutionDoc =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );
      expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecutionDoc?.error).toBe(
        'Error: Retry step "failingStepByTimeout" has exceeded the maximum number of attempts.'
      );
      expect(workflowExecutionDoc?.scopeStack).toEqual([]);
    });

    it('should not execute final step', async () => {
      const finalStepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(finalStepExecutions.length).toBe(0);
    });
  });
});
