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

const STEP_ERROR = {
  type: 'Error',
  message: 'Error: Constantly failing connector',
};

const TIMEOUT_ERROR = {
  type: 'TimeoutError',
  message: 'TimeoutError: Step execution exceeded the configured timeout of 2s.',
};

describe('error handling scenarios', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('retry only - exhaustion', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 1s
    with:
      message: 'Hi'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to last step error (type and message)', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(STEP_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes failing step 3 times (1 initial + 2 retries)', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'failingStep' &&
          se.stepType === FakeConnectors.constantlyFailing.actionTypeId
      );
      expect(executions.length).toBe(3);
      executions.forEach((se) => {
        expect(se.status).toBe(ExecutionStatus.FAILED);
        expect(se.error).toEqual(STEP_ERROR);
      });
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });

  describe('fallback only - step fails', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      fallback:
        - name: fallbackStep
          type: slack
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback ran'
    with:
      message: 'Hi'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to failing step error', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(STEP_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes fallback step once', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'fallbackStep');
      expect(executions.length).toBe(1);
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });

  describe('timeout only', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    with:
      message: 'Slow'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to TimeoutError with expected message', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(TIMEOUT_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('marks timed-out step as FAILED with TimeoutError', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'timeoutStep' &&
          se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
      );
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe(ExecutionStatus.FAILED);
      expect(executions[0].error).toEqual(TIMEOUT_ERROR);
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });

  describe('timeout + retry - exhaustion, continue false', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    on-failure:
      retry:
        max-attempts: 1
      continue: false
    with:
      message: 'Slow'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to TimeoutError', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(TIMEOUT_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes timeout step twice (1 initial + 1 retry)', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'timeoutStep' &&
          se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
      );
      expect(executions.length).toBe(2);
      executions.forEach((se) => {
        expect(se.status).toBe(ExecutionStatus.FAILED);
        expect(se.error).toEqual(TIMEOUT_ERROR);
      });
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });

  describe('timeout + retry + fallback, continue true', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    on-failure:
      retry:
        max-attempts: 1
      fallback:
        - name: fallbackStep
          type: slack
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback'
      continue: true
    with:
      message: 'Slow'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('completes workflow successfully', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.COMPLETED);
      expect(doc?.error).toBe(undefined);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes fallback step once', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'fallbackStep');
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe(ExecutionStatus.COMPLETED);
      expect(executions[0].error).toBe(undefined);
    });

    it('executes final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('records TimeoutError on each timeout step execution', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'timeoutStep' &&
          se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
      );
      expect(executions.length).toBe(2);
      executions.forEach((se) => {
        expect(se.status).toBe(ExecutionStatus.FAILED);
        expect(se.error).toEqual(TIMEOUT_ERROR);
      });
    });
  });

  describe('timeout + retry + fallback, continue false', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    on-failure:
      retry:
        max-attempts: 1
      fallback:
        - name: fallbackStep
          type: slack
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback'
      continue: false
    with:
      message: 'Slow'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to TimeoutError', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(TIMEOUT_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes fallback step once', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'fallbackStep');
      expect(executions.length).toBe(1);
      expect(executions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });

  describe('retry + fallback - exhaustion then fallback', () => {
    beforeAll(async () => {
      jest.clearAllMocks();
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: failingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 1s
      fallback:
        - name: fallbackStep
          type: slack
          connector-id: ${FakeConnectors.slack1.name}
          with:
            message: 'Fallback after retries'
    with:
      message: 'Hi'

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final'
`,
      });
    });

    it('sets workflow status to FAILED', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.status).toBe(ExecutionStatus.FAILED);
    });

    it('sets workflow error to last step error', () => {
      const doc = workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(doc?.error).toEqual(STEP_ERROR);
      expect(doc?.scopeStack).toEqual([]);
    });

    it('executes failing step 3 times then fallback once', () => {
      const failingExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        (se) =>
          se.stepId === 'failingStep' &&
          se.stepType === FakeConnectors.constantlyFailing.actionTypeId
      );
      const fallbackExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'fallbackStep');
      expect(failingExecutions.length).toBe(3);
      expect(fallbackExecutions.length).toBe(1);
      failingExecutions.forEach((se) => {
        expect(se.status).toBe(ExecutionStatus.FAILED);
        expect(se.error).toEqual(STEP_ERROR);
      });
      expect(fallbackExecutions[0].status).toBe(ExecutionStatus.COMPLETED);
    });

    it('does not execute final step', () => {
      const executions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((se) => se.stepId === 'finalStep');
      expect(executions.length).toBe(0);
    });
  });
});
