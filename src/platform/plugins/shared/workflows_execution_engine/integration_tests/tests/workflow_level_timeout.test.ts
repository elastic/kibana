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
  - name: slowInferenceStep1
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 1
  - name: slowInferenceStep2
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 2
  - name: slowInferenceStep3
    type: ${FakeConnectors.slow_1sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_1sec_inference.name}
    with:
        message: 3
  - name: slowInferenceStep4
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
        se.stepId === 'slowInferenceStep' &&
        se.stepType === FakeConnectors.slow_1sec_inference.actionTypeId
    );

    slowInferenceStepExecutions.forEach((stepExecution) => {
      expect(stepExecution.status).toBe(ExecutionStatus.COMPLETED);
      expect(stepExecution.error).toBeUndefined();
    });
  });

  it('should invoke connector only 3 times timeout', async () => {
    const connectorCalls = workflowRunFixture.unsecuredActionsClientMock.execute.mock.calls.filter(
      (call) => call[0].id === FakeConnectors.slow_1sec_inference.id
    );

    expect(connectorCalls.length).toBe(3);
  });
});
