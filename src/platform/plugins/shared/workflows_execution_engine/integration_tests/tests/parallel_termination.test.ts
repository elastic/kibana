/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const executionId = 'fake_workflow_execution_id';

const definition = (type: string) => `
steps:
  - name: branches
    type: parallel
    on-failure:
      retry: { max-attempts: 2, delay: 1ms }
      fallback:
        - name: forbiddenFallback
          type: console
          with: { message: forbidden }
    branches:
      - name: waiting
        steps:
          - name: pause
            type: wait
            with: { duration: 1h }
          - name: forbiddenAfterWait
            type: console
            with: { message: forbidden }
      - name: returning
        steps:
          - name: terminate
            type: ${type}
            with: { message: chosen }
      - name: competing
        steps:
          - name: later
            type: workflow.output
            with: { message: later }
  - name: forbiddenAfterJoin
    type: console
    with: { message: forbidden }
`;

describe('coordinated workflow termination', () => {
  it('recovers an accepted result after a crash before sibling cleanup', async () => {
    const fixture = new WorkflowRunFixture();
    const repository = fixture.workflowExecutionRepositoryMock;
    const update = repository.updateWorkflowExecution.bind(repository);
    let snapshot:
      | { workflow: EsWorkflowExecution; steps: Map<string, EsWorkflowStepExecution> }
      | undefined;
    jest.spyOn(repository, 'updateWorkflowExecution').mockImplementation(async (patch) => {
      await update(patch);
      if (patch.pendingTermination && !snapshot) {
        const workflow = repository.workflowExecutions.get(executionId);
        if (!workflow) throw new Error('Missing workflow');
        snapshot = structuredClone({
          workflow,
          steps: fixture.stepExecutionRepositoryMock.stepExecutions,
        });
      }
    });
    await fixture.runWorkflow({ workflowYaml: definition('workflow.output') });
    if (!snapshot) throw new Error('Missing termination commit');
    repository.workflowExecutions.set(executionId, snapshot.workflow);
    fixture.stepExecutionRepositoryMock.stepExecutions.clear();
    for (const [id, step] of snapshot.steps)
      fixture.stepExecutionRepositoryMock.stepExecutions.set(id, step);
    await fixture.resumeWorkflow();
    const workflow = repository.workflowExecutions.get(executionId);
    expect(workflow?.status).toBe(ExecutionStatus.COMPLETED);
    expect(workflow?.context.output).toEqual({ message: 'chosen' });
    const steps = [...fixture.stepExecutionRepositoryMock.stepExecutions.values()];
    expect(steps.every((step) => isTerminalStatus(step.status))).toBe(true);
    expect(steps.filter((step) => step.stepId.startsWith('forbidden'))).toEqual([]);
  });

  it.each([
    ['workflow.output', ExecutionStatus.COMPLETED],
    ['workflow.fail', ExecutionStatus.FAILED],
  ])('%s terminates all branches and bypasses parent error handlers', async (type, status) => {
    const fixture = new WorkflowRunFixture();
    await fixture.runWorkflow({ workflowYaml: definition(type) });
    const workflow = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId);
    expect(workflow?.status).toBe(status);
    expect(workflow?.context.output).toEqual({ message: 'chosen' });
    if (status === ExecutionStatus.FAILED) expect(workflow?.error?.message).toBe('chosen');
    const steps = [...fixture.stepExecutionRepositoryMock.stepExecutions.values()];
    expect(steps.filter((step) => step.stepId.startsWith('forbidden'))).toEqual([]);
    expect(steps.every((step) => isTerminalStatus(step.status))).toBe(true);
    expect(steps.find((step) => step.stepId === 'terminate')?.status).toBe(
      ExecutionStatus.COMPLETED
    );
  });
});
