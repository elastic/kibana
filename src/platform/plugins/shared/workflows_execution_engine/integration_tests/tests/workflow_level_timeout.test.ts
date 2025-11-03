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

describe('workflow level timeout', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  const workflowYaml = `
settings:
  timeout: 2s

consts:
  items: '["item1", "item2", "item3", "item4"]'

steps:
  - name: slowInferenceStep1Completed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 1
  - name: slowInferenceStep2Completed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 2
  - name: slowInferenceStep3Failed
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 3
  - name: slowInferenceStep4NotStarted
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 4
`;

  beforeAll(async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml,
    });
  });

  it('should have correct step execution count', async () => {
    const stepExecutionsCount = workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.size;
    expect(stepExecutionsCount).toBe(3);
  });

  it('should set timeout status for workflow', async () => {
    const workflowExecutionDoc =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.TIMED_OUT);
    expect(workflowExecutionDoc?.scopeStack).not.toEqual([]);
  });

  it('should have completed status for executed steps', async () => {
    const slowInferenceStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter(
      (se) =>
        se.stepId.endsWith('Completed') &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );
    expect(slowInferenceStepExecutions.length).toBe(2);
    slowInferenceStepExecutions.forEach((stepExecution) => {
      expect(stepExecution.status).toBe(ExecutionStatus.COMPLETED);
      expect(stepExecution.error).toBeUndefined();
    });
  });

  it('should have failed status for step exceeding timeout', async () => {
    const slowInferenceStepExecution = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find(
      (se) =>
        se.stepId.endsWith('Failed') &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );
    expect(slowInferenceStepExecution).toBeDefined();
    expect(slowInferenceStepExecution?.status).toBe(ExecutionStatus.FAILED);
    expect(slowInferenceStepExecution?.error).toContain('Failed due to workflow timeout');
  });

  it('should not have started step following failed step', async () => {
    const slowInferenceStepExecution = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).find(
      (se) =>
        se.stepId.endsWith('NotStarted') &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );
    expect(slowInferenceStepExecution).toBeUndefined();
  });

  it('should invoke connector only 3 times timeout', async () => {
    const connectorCalls = workflowRunFixture.unsecuredActionsClientMock.execute.mock.calls.filter(
      (call) => call[0].id === FakeConnectors.slow_1sec_inference.id
    );

    expect(connectorCalls.length).toBe(3);
  });
});
