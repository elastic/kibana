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

describe('workflow.output step', () => {
  let workflowRunFixture: WorkflowRunFixture;

  beforeEach(async () => {
    workflowRunFixture = new WorkflowRunFixture();
  });

  describe('basic output emission', () => {
    it('should emit declared outputs and complete workflow', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string
  - name: count
    type: number
steps:
  - name: emit
    type: workflow.output
    with:
      result: "success"
      count: 42
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.output).toEqual({
        result: 'success',
        count: 42,
      });
    });

    it('should record step execution with workflow.output type', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string
steps:
  - name: out_step
    type: workflow.output
    with:
      result: "done"
        `,
      });

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      const outStep = stepExecutions.find((se) => se.stepId === 'out_step');

      expect(outStep).toBeDefined();
      expect(outStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(outStep?.stepType).toBe('workflow.output');
      expect(outStep?.output).toEqual({ result: 'done' });
    });
  });

  describe('early termination', () => {
    it('should stop workflow execution immediately after workflow.output', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: value
    type: string
steps:
  - name: first_step
    type: slack
    connector-id: ${FakeConnectors.slack1.name}
    with:
      message: "First"

  - name: out_step
    type: workflow.output
    with:
      value: "early exit"

  - name: should_not_run
    type: slack
    connector-id: ${FakeConnectors.slack2.name}
    with:
      message: "Should not execute"
        `,
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.output).toEqual({ value: 'early exit' });

      const stepExecutions = Array.from(
        workflowRunFixture.stepExecutionRepositoryMock.stepExecutions.values()
      );
      expect(stepExecutions).toHaveLength(2); // first_step + out_step

      const firstStep = stepExecutions.find((se) => se.stepId === 'first_step');
      const outStep = stepExecutions.find((se) => se.stepId === 'out_step');
      const shouldNotRun = stepExecutions.find((se) => se.stepId === 'should_not_run');

      expect(firstStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(outStep?.status).toBe(ExecutionStatus.COMPLETED);
      expect(shouldNotRun).toBeUndefined();
    });
  });

  describe('template expressions in output values', () => {
    it('should support step output references in workflow.output', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: summary
    type: string
  - name: total
    type: number
inputs:
  - name: x
    type: number
  - name: y
    type: number
steps:
  - name: calc
    type: data.set
    with:
      count: "\${{ inputs.x | plus: inputs.y }}"

  - name: emit
    type: workflow.output
    with:
      summary: "Sum is {{ steps.calc.output.count }}"
      total: "\${{ steps.calc.output.count }}"
        `,
        inputs: { x: 3, y: 7 },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.output).toMatchObject({
        summary: 'Sum is 10',
        total: 10,
      });
    });
  });

  describe('workflow.output inside if block', () => {
    it('should emit output when if branch is taken', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: result
    type: string
inputs:
  - name: fail
    type: boolean
    default: false
steps:
  - name: branch
    type: if
    condition: "\${{ inputs.fail }}"
    steps:
      - name: fail_out
        type: workflow.output
        status: failed
        with:
          message: "Ooops"
    else:
      - name: success_out
        type: workflow.output
        with:
          result: "success"
        `,
        inputs: { fail: false },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.output).toEqual({ result: 'success' });
    });

    it('should use output from else branch when condition is false', async () => {
      await workflowRunFixture.runWorkflow({
        workflowYaml: `
outputs:
  - name: path
    type: string
inputs:
  - name: useElse
    type: boolean
steps:
  - name: branch
    type: if
    condition: "\${{ inputs.useElse }}"
    steps:
      - name: then_out
        type: workflow.output
        with:
          path: "then"
    else:
      - name: else_out
        type: workflow.output
        with:
          path: "else"
        `,
        inputs: { useElse: false },
      });

      const workflowExecution =
        workflowRunFixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        );

      expect(workflowExecution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(workflowExecution?.context?.output).toEqual({ path: 'else' });
    });
  });
});
