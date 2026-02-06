/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../workflow_run_fixture';

describe('workflow.fail step', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('basic functionality', () => {
    it('should fail workflow with error message', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: fail_step
    type: workflow.fail
    with:
      message: "Workflow failed due to validation error"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error).toBeDefined();
      expect(workflowExecution?.error?.message).toBe('Workflow failed due to validation error');
      expect(workflowExecution?.context?.output).toEqual({
        message: 'Workflow failed due to validation error',
      });
    });

    it('should store message in context.output for external access', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: terminate
    type: workflow.fail
    with:
      message: "Critical error occurred"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.context?.output).toMatchObject({
        message: 'Critical error occurred',
      });
    });

    it('should record step execution with workflow.output type', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: fail_step
    type: workflow.fail
    with:
      message: "Test failure"
        `,
      });

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );

      const failStep = stepExecutions.find((se) => se.stepId === 'fail_step');

      expect(failStep).toBeDefined();
      expect(failStep?.status).toBe(ExecutionStatus.COMPLETED);
      // Step type should be workflow.output (internal transformation)
      expect(failStep?.stepType).toBe('workflow.output');
      expect(failStep?.output).toEqual({
        message: 'Test failure',
      });
    });
  });

  describe('conditional failure', () => {
    it('should fail workflow when condition is true', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
inputs:
  - name: amount
    type: number
steps:
  - name: validate_amount
    type: workflow.fail
    if: "\${{ inputs.amount < 0 }}"
    with:
      message: "Amount cannot be negative: \${{inputs.amount}}"

  - name: process
    type: .slack
    with:
      connector-id: \${connectors.byName.Slack.id}
      subAction: postMessage
      subActionParams:
        channels:
          - general
        text: "Processing amount: \${{inputs.amount}}"
        `,
        inputs: { amount: -10 },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error?.message).toBe('Amount cannot be negative: -10');

      // Verify the process step was never executed
      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      const processStep = stepExecutions.find((se) => se.stepId === 'process');
      expect(processStep).toBeUndefined();
    });

    it('should skip workflow.fail when condition is false', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
inputs:
  - name: amount
    type: number
steps:
  - name: validate_amount
    type: workflow.fail
    if: "\${{ inputs.amount < 0 }}"
    with:
      message: "Amount cannot be negative"

  - name: process
    type: .slack
    with:
      connector-id: \${connectors.byName.Slack.id}
      subAction: postMessage
      subActionParams:
        channels:
          - general
        text: "Processing amount: \${{inputs.amount}}"
        `,
        inputs: { amount: 100 },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);

      // Verify the process step was executed
      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      const processStep = stepExecutions.find((se) => se.stepId === 'process');
      expect(processStep).toBeDefined();
      expect(processStep?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('message templating', () => {
    it('should support dynamic message with template expressions', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
inputs:
  - name: username
    type: string
  - name: role
    type: string
steps:
  - name: check_permission
    type: workflow.fail
    with:
      message: "User '\${{inputs.username}}' with role '\${{inputs.role}}' is not authorized"
        `,
        inputs: { username: 'john_doe', role: 'viewer' },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error?.message).toBe(
        "User 'john_doe' with role 'viewer' is not authorized"
      );
    });

    it('should support message with step output references', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: check_value
    type: .slack
    with:
      connector-id: \${connectors.byName.Slack.id}
      subAction: postMessage
      subActionParams:
        channels:
          - general
        text: "Checking"

  - name: fail_with_context
    type: workflow.fail
    with:
      message: "Step check_value failed with status: \${{steps.check_value.output.status}}"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error?.message).toContain('Step check_value failed');
    });
  });

  describe('execution order', () => {
    it('should stop workflow execution immediately', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: first_step
    type: .slack
    with:
      connector-id: \${connectors.byName.Slack.id}
      subAction: postMessage
      subActionParams:
        channels:
          - general
        text: "First"

  - name: fail_step
    type: workflow.fail
    with:
      message: "Stopping workflow"

  - name: should_not_run
    type: .slack
    with:
      connector-id: \${connectors.byName.Slack.id}
      subAction: postMessage
      subActionParams:
        channels:
          - general
        text: "Should not execute"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      expect(stepExecutions).toHaveLength(2); // first_step + fail_step

      const firstStep = stepExecutions.find((se) => se.stepId === 'first_step');
      const failStep = stepExecutions.find((se) => se.stepId === 'fail_step');
      const shouldNotRun = stepExecutions.find((se) => se.stepId === 'should_not_run');

      expect(firstStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(failStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(shouldNotRun).toBeUndefined(); // Should not have executed
    });
  });

  describe('error handling', () => {
    it('should handle template expression errors gracefully', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: fail_with_invalid_expression
    type: workflow.fail
    with:
      message: "Error: \${{steps.nonexistent.output}}"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      // Should still fail, even if template evaluation has issues
      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
    });
  });
});
