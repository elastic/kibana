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

describe('workflow.output step', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('basic functionality', () => {
    it('should emit outputs and complete workflow successfully', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: message
    type: string
    required: true
  - name: count
    type: number
    required: true

steps:
  - name: emit_result
    type: workflow.output
    with:
      message: "Hello, World!"
      count: 42
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.error).toBeUndefined();
      expect(workflowExecution?.context?.outputs).toEqual({
        message: 'Hello, World!',
        count: 42,
      });
    });

    it('should emit outputs with dynamic values from previous steps', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string
    required: true

steps:
  - name: fetch_data
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Fetching data"

  - name: emit_result
    type: workflow.output
    with:
      result: "{{steps.fetch_data.output.text}}"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        result: 'ok',
      });
    });

    it('should terminate workflow immediately without executing subsequent steps', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: early_result
    type: string

steps:
  - name: emit_early
    type: workflow.output
    with:
      early_result: "Early exit"

  - name: should_not_execute
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "This should not run"
`,
      });

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );

      const emitStep = stepExecutions.find((se) => se.stepId === 'emit_early');
      const shouldNotExecuteStep = stepExecutions.find((se) => se.stepId === 'should_not_execute');

      expect(emitStep).toBeDefined();
      expect(emitStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(shouldNotExecuteStep).toBeUndefined();
    });
  });

  describe('status handling', () => {
    it('should set workflow status to completed by default', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: data
    type: string

steps:
  - name: emit_output
    type: workflow.output
    with:
      data: "test"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should set workflow status to cancelled when specified', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: reason
    type: string

steps:
  - name: cancel_workflow
    type: workflow.output
    status: cancelled
    with:
      reason: "User requested cancellation"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.CANCELLED);
      expect(workflowExecution?.context?.outputs).toEqual({
        reason: 'User requested cancellation',
      });
    });

    it('should set workflow status to failed when specified', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: error
    type: string

steps:
  - name: fail_workflow
    type: workflow.output
    status: failed
    with:
      error: "Critical error occurred"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.context?.outputs).toEqual({
        error: 'Critical error occurred',
      });
    });
  });

  describe('output validation', () => {
    it('should fail when required output is missing', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: required_field
    type: string
    required: true

steps:
  - name: emit_incomplete
    type: workflow.output
    with:
      optional_field: "value"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error?.message).toContain('required_field');
    });

    it('should fail when output has wrong type', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: count
    type: number
    required: true

steps:
  - name: emit_wrong_type
    type: workflow.output
    with:
      count: "not a number"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.FAILED);
      expect(workflowExecution?.error?.message).toContain('count');
    });

    it('should succeed when all required outputs are provided with correct types', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: message
    type: string
    required: true
  - name: count
    type: number
    required: true
  - name: success
    type: boolean
    required: true

steps:
  - name: emit_all
    type: workflow.output
    with:
      message: "All fields provided"
      count: 100
      success: true
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        message: 'All fields provided',
        count: 100,
        success: true,
      });
    });

    it('should allow optional outputs to be omitted', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: required_field
    type: string
    required: true
  - name: optional_field
    type: string
    required: false

steps:
  - name: emit_partial
    type: workflow.output
    with:
      required_field: "Required value"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        required_field: 'Required value',
      });
    });

    it('should succeed when workflow has no outputs schema defined', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
steps:
  - name: emit_anything
    type: workflow.output
    with:
      any_field: "Any value"
      another_field: 123
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        any_field: 'Any value',
        another_field: 123,
      });
    });
  });

  describe('conditional execution', () => {
    it('should execute workflow.output step when condition is true', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string

steps:
  - name: check_condition
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Checking"

  - name: conditional_output
    type: workflow.output
    if: 'steps.check_condition.output.text:"ok"'
    with:
      result: "Condition was true"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        result: 'Condition was true',
      });
    });

    it('should skip workflow.output step when condition is false', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string

steps:
  - name: check_condition
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "Checking"

  - name: conditional_output
    type: workflow.output
    if: 'steps.check_condition.output.text:"not_ok"'
    with:
      result: "This should not emit"

  - name: final_step
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: "Final step"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toBeUndefined();

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      const finalStep = stepExecutions.find((se) => se.stepId === 'final_step');
      expect(finalStep).toBeDefined();
      expect(finalStep?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('complex output types', () => {
    it('should handle array outputs', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: items
    type: array

steps:
  - name: emit_array
    type: workflow.output
    with:
      items: [1, 2, 3, 4, 5]
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs?.items).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle choice outputs', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: status
    type: choice
    options: [success, failure, pending]

steps:
  - name: emit_choice
    type: workflow.output
    with:
      status: "success"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs?.status).toBe('success');
    });

    it('should handle multiple output types in one step', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: message
    type: string
  - name: count
    type: number
  - name: success
    type: boolean
  - name: items
    type: array

steps:
  - name: emit_multiple
    type: workflow.output
    with:
      message: "Operation completed"
      count: 42
      success: true
      items: ["item1", "item2", "item3"]
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        message: 'Operation completed',
        count: 42,
        success: true,
        items: ['item1', 'item2', 'item3'],
      });
    });
  });

  describe('workflow.output as only step', () => {
    it('should work when workflow.output is the only step', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: greeting
    type: string

steps:
  - name: immediate_output
    type: workflow.output
    with:
      greeting: "Hello from workflow!"
`,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.outputs).toEqual({
        greeting: 'Hello from workflow!',
      });
    });
  });

  describe('step execution tracking', () => {
    it('should create step execution record for workflow.output', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: data
    type: string

steps:
  - name: output_step
    type: workflow.output
    with:
      data: "test"
`,
      });

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );

      const outputStepExecution = stepExecutions.find((se) => se.stepId === 'output_step');

      expect(outputStepExecution).toBeDefined();
      expect(outputStepExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(outputStepExecution?.stepType).toBe('workflow.output');
    });
  });

  // TODO: Add integration tests for parent workflow accessing child workflow outputs
  // This requires more complex setup with workflow.execute step and workflow repository mocking
  // See workflow_execute.test.ts for examples
});
