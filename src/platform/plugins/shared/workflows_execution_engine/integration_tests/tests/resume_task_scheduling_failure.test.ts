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

const SCHEDULING_ERROR_MESSAGE =
  'Failed to create UIAM API key for task type: workflow:resume: [0xD38358/AUTHENTICATION.API_KEY] Authentication failed';

describe('workflow when the resume task cannot be scheduled', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(() => {
    workflowRunFixture = new WorkflowRunFixture();
    workflowRunFixture.taskManagerMock.schedule.mockRejectedValue(
      new Error(SCHEDULING_ERROR_MESSAGE)
    );
  });

  const getWorkflowExecution = () =>
    workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );

  const getStepExecutions = (stepId: string) =>
    Array.from(workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()).filter(
      (stepExecution) => stepExecution.stepId === stepId
    );

  const expectFailedWithSchedulingError = () => {
    const workflowExecution = getWorkflowExecution();
    expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
    expect(workflowExecution?.finishedAt).toBeDefined();
    expect(workflowExecution?.error).toEqual(
      expect.objectContaining({
        message: `Failed to schedule workflow resume task: ${SCHEDULING_ERROR_MESSAGE}`,
      })
    );
  };

  describe('retry delay inside continue', () => {
    beforeEach(async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: constantlyFailingStep
    type: ${FakeConnectors.constantlyFailing.actionTypeId}
    connector-id: ${FakeConnectors.constantlyFailing.name}
    on-failure:
      retry:
        max-attempts: 2
        delay: 10m
      continue: true
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

    it('fails the workflow instead of letting continue recover it', () => {
      expectFailedWithSchedulingError();
    });

    it('tries to schedule the resume task only once', () => {
      expect(workflowRunFixture.taskManagerMock.schedule).toHaveBeenCalledTimes(1);
    });

    it('does not run the step after the failed one', () => {
      expect(getStepExecutions('finalStep')).toHaveLength(0);
    });

    it('does not leave any step execution non-terminal', () => {
      const nonTerminalSteps = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter(
        ({ status }) => status !== ExecutionStatus.FAILED && status !== ExecutionStatus.COMPLETED
      );
      expect(nonTerminalSteps).toEqual([]);
    });
  });

  describe('long wait step with continue', () => {
    beforeEach(async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: waitStep
    type: wait
    on-failure:
      continue: true
    with:
      duration: 10m

  - name: finalStep
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: 'Final message!'
`,
      });
    });

    it('fails the workflow instead of skipping the wait', () => {
      expectFailedWithSchedulingError();
    });

    it('does not run the step after the wait', () => {
      expect(getStepExecutions('finalStep')).toHaveLength(0);
    });
  });
});
