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

describe('step level timeout', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeAll(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  const workflowYaml = `
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: 2s
    with:
      message: 'This step will timeout'
  
  - name: finalStep
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'This step should not be executed'
`;

  beforeAll(async () => {
    await workflowRunFixture.runWorkflow({
      workflowYaml,
    });
  });

  it('should fail workflow with error when step times out', async () => {
    const workflowExecutionDoc =
      workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
    expect(workflowExecutionDoc?.status).toBe(ExecutionStatus.FAILED);
    expect(workflowExecutionDoc?.error).toBeDefined();
    expect(workflowExecutionDoc?.error).toEqual({
      type: 'TimeoutError',
      message: 'Step execution exceeded the configured timeout of 2s.',
    });
    expect(workflowExecutionDoc?.scopeStack).toEqual([]);
  });

  it('should have timeout step with failure status and error', async () => {
    const timeoutStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter(
      (se) =>
        se.stepId === 'timeoutStep' &&
        se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
    );

    expect(timeoutStepExecutions.length).toBe(1);
    const timeoutStepExecution = timeoutStepExecutions[0];

    expect(timeoutStepExecution.status).toBe(ExecutionStatus.FAILED);
    expect(timeoutStepExecution.error).toBeDefined();
    expect(timeoutStepExecution.error).toEqual({
      type: 'TimeoutError',
      message: 'Step execution exceeded the configured timeout of 2s.',
    });
  });

  it('should not finish before the configured timeout', async () => {
    const timeoutStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter(
      (se) =>
        se.stepId === 'timeoutStep' &&
        se.stepType === FakeConnectors.slow_3sec_inference.actionTypeId
    );

    expect(timeoutStepExecutions.length).toBe(1);
    const timeoutStepExecution = timeoutStepExecutions[0];

    expect(timeoutStepExecution.executionTimeMs).toBeGreaterThan(1999);
    expect(timeoutStepExecution.executionTimeMs).toBeLessThan(10_000);
  });

  it('should not execute final step after timeout', async () => {
    const finalStepExecutions = Array.from(
      workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
    ).filter((se) => se.stepId === 'finalStep');

    expect(finalStepExecutions.length).toBe(0);
  });
});

describe('step level timeout with a templated value', () => {
  const buildYaml = () => `
inputs:
  stepTimeout:
    type: string
    required: false
steps:
  - name: timeoutStep
    type: ${FakeConnectors.slow_3sec_inference.actionTypeId}
    connector-id: ${FakeConnectors.slow_3sec_inference.name}
    timeout: "{{ inputs.stepTimeout | default: '10s' }}"
    with:
      message: 'Templated timeout'
  - name: finalStep
    type: ${FakeConnectors.slack1.actionTypeId}
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: 'After the timed step'
`;

  const getExecution = (fixture: WorkflowRunFixture) =>
    fixture.workflowExecutionRepositoryMock.workflowExecutions.get('fake_workflow_execution_id');

  it('times the step out at the rendered duration', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: buildYaml(), inputs: { stepTimeout: '1s' } });

    const execution = getExecution(fixture);
    expect(execution?.status).toBe(ExecutionStatus.FAILED);
    expect(execution?.error).toEqual({
      type: 'TimeoutError',
      message: 'Step execution exceeded the configured timeout of 1s.',
    });
  });

  it('lets the step finish when the rendered duration is long enough', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: buildYaml() });

    expect(getExecution(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    const finalStep = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
      (se) => se.stepId === 'finalStep'
    );
    expect(finalStep?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('fails the step when the template renders to an invalid duration', async () => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: buildYaml(), inputs: { stepTimeout: 'soon' } });

    const execution = getExecution(fixture);
    expect(execution?.status).toBe(ExecutionStatus.FAILED);
    expect(execution?.error).toEqual(
      expect.objectContaining({
        message: expect.stringContaining('Invalid duration format: soon'),
      })
    );
  });
});
