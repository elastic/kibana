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

describe('waitForInput step', () => {
  let fixture: WorkflowRunFixture;

  beforeEach(() => {
    fixture = new WorkflowRunFixture();
  });

  describe('basic pause and resume', () => {
    const yaml = `
steps:
  - name: ask
    type: waitForInput
    with:
      message: "Approve?"
  - name: log
    type: console
    with:
      message: "done"
`;

    it('should pause the workflow in WAITING_FOR_INPUT status', async () => {
      await fixture.runWorkflow({ workflowYaml: yaml });
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should set the step status to WAITING_FOR_INPUT', async () => {
      await fixture.runWorkflow({ workflowYaml: yaml });
      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      const askStep = steps.find((s) => s.stepId === 'ask');
      expect(askStep?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should resume and complete after providing input', async () => {
      await fixture.runWorkflow({ workflowYaml: yaml });

      // Simulate resume: set resumeInput and run again
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      exec.context = { ...exec.context, resumeInput: { approved: true } };
      fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);

      await fixture.resumeWorkflow();

      const updated = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(updated?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('should pass resumeInput as step output', async () => {
      await fixture.runWorkflow({ workflowYaml: yaml });

      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      exec.context = { ...exec.context, resumeInput: { approved: true, note: 'ok' } };
      fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);

      await fixture.resumeWorkflow();

      const steps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
      const askStep = steps.find((s) => s.stepId === 'ask');
      expect(askStep?.output).toEqual({ approved: true, note: 'ok' });
      expect(askStep?.status).toBe(ExecutionStatus.COMPLETED);
    });
  });

  describe('inside foreach loop', () => {
    const foreachYaml = `
steps:
  - name: loop
    type: foreach
    foreach: '["alpha", "beta", "gamma"]'
    steps:
      - name: ask_for_input
        type: waitForInput
        with:
          message: "Approve item"
      - name: log_item
        type: console
        with:
          message: "received"
`;

    it('should pause on the first iteration', async () => {
      await fixture.runWorkflow({ workflowYaml: foreachYaml });

      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(exec?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

      // Only the first iteration's ask_for_input should exist
      const waitingSteps = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((s) => s.stepId === 'ask_for_input');
      expect(waitingSteps.length).toBe(1);
      expect(waitingSteps[0].status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    });

    it('should resume first iteration and pause on the second', async () => {
      await fixture.runWorkflow({ workflowYaml: foreachYaml });

      // Resume iteration 1
      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      exec.context = { ...exec.context, resumeInput: { value: 'input-1' } };
      fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);
      await fixture.resumeWorkflow();

      // Should be paused again (second iteration)
      const updated = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(updated?.status).toBe(ExecutionStatus.WAITING_FOR_INPUT);

      // Two ask_for_input steps now (one completed, one waiting)
      const askSteps = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((s) => s.stepId === 'ask_for_input');
      expect(askSteps.length).toBe(2);
      expect(askSteps.filter((s) => s.status === ExecutionStatus.COMPLETED).length).toBe(1);
      expect(askSteps.filter((s) => s.status === ExecutionStatus.WAITING_FOR_INPUT).length).toBe(1);
    });

    it('should complete after resuming all three iterations', async () => {
      await fixture.runWorkflow({ workflowYaml: foreachYaml });

      for (let i = 0; i < 3; i++) {
        const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        )!;
        exec.context = { ...exec.context, resumeInput: { iteration: i } };
        fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);
        await fixture.resumeWorkflow();
      }

      const final = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(final?.status).toBe(ExecutionStatus.COMPLETED);

      // All three ask_for_input steps completed
      const askSteps = Array.from(
        fixture.stepExecutionRepositoryMock.stepExecutions.values()
      ).filter((s) => s.stepId === 'ask_for_input');
      expect(askSteps.length).toBe(3);
      expect(askSteps.every((s) => s.status === ExecutionStatus.COMPLETED)).toBe(true);
    });

    it('should isolate output per iteration', async () => {
      await fixture.runWorkflow({ workflowYaml: foreachYaml });

      const inputs = [{ val: 'a' }, { val: 'b' }, { val: 'c' }];
      for (const input of inputs) {
        const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
          'fake_workflow_execution_id'
        )!;
        exec.context = { ...exec.context, resumeInput: input };
        fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);
        await fixture.resumeWorkflow();
      }

      const askSteps = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values())
        .filter((s) => s.stepId === 'ask_for_input')
        .sort((a, b) => (a.stepExecutionIndex ?? 0) - (b.stepExecutionIndex ?? 0));

      expect(askSteps.length).toBe(3);
      expect(askSteps[0].output).toEqual({ val: 'a' });
      expect(askSteps[1].output).toEqual({ val: 'b' });
      expect(askSteps[2].output).toEqual({ val: 'c' });
    });
  });

  describe('with schema', () => {
    const schemaYaml = `
steps:
  - name: get_info
    type: waitForInput
    with:
      message: "Provide details"
      schema:
        type: object
        properties:
          ticket:
            type: string
          priority:
            type: string
            enum: [low, medium, high]
            default: medium
        required:
          - ticket
  - name: done
    type: console
    with:
      message: "done"
`;

    it('should pause and resume with schema-conforming input', async () => {
      await fixture.runWorkflow({ workflowYaml: schemaYaml });

      const exec = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      )!;
      exec.context = {
        ...exec.context,
        resumeInput: { ticket: 'T-42', priority: 'high' },
      };
      fixture.workflowExecutionRepositoryMock.workflowExecutions.set(exec.id, exec);
      await fixture.resumeWorkflow();

      const updated = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
        'fake_workflow_execution_id'
      );
      expect(updated?.status).toBe(ExecutionStatus.COMPLETED);

      const step = Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values()).find(
        (s) => s.stepId === 'get_info'
      );
      expect(step?.output).toEqual({ ticket: 'T-42', priority: 'high' });
    });
  });
});
