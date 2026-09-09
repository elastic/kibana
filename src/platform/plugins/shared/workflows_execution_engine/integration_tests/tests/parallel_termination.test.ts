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

afterEach(() => jest.restoreAllMocks());

const assertTerminationRecords = (fixture: WorkflowRunFixture) => {
  const steps = [...fixture.stepExecutionRepositoryMock.stepExecutions.values()];
  const winner = steps.find((step) => step.stepId === 'terminate');
  expect(winner).toMatchObject({
    status: ExecutionStatus.COMPLETED,
    error: null,
    executionCheckpoint: null,
  });
  expect(steps.filter((step) => step.stepId === 'branches').map((step) => step.status)).toEqual(
    expect.arrayContaining([ExecutionStatus.COMPLETED])
  );
  expect(
    steps
      .filter((step) => step.stepId === 'branches')
      .every((step) => step.status === ExecutionStatus.COMPLETED)
  ).toBe(true);
  expect(steps.find((step) => step.stepId === 'pause')?.status).toBe(ExecutionStatus.CANCELLED);
  const events = fixture.createEventDocuments.mock.calls.flatMap(([request]) => request.documents);
  const completions = events.filter(
    (event) => event.workflow?.step_id === 'terminate' && event.event?.action === 'step-complete'
  );
  expect(completions).toHaveLength(1);
  expect(completions[0]).toMatchObject({ event: { outcome: 'success' } });
  expect(completions[0].error).toBeUndefined();
  expect(
    events.filter(
      (event) => event.workflow?.step_id === 'terminate' && event.event?.outcome === 'failure'
    )
  ).toEqual([]);
};

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
    for (const [id, step] of snapshot.steps) {
      if (step.stepId === 'terminate') {
        step.status = ExecutionStatus.TIMED_OUT;
        step.error = { type: 'TimeoutError', message: 'stale timeout' };
        const decision = snapshot.workflow.pendingTermination;
        if (!decision) throw new Error('Missing decision');
        step.executionCheckpoint = {
          branchId: 'returning',
          sequence: 1,
          nodeId: decision.nodeId,
          currentNodeId: decision.nodeId,
          stackFrames: decision.stackFrames,
          status: 'timed_out',
          waiting: false,
        };
      }
      fixture.stepExecutionRepositoryMock.stepExecutions.set(id, step);
    }
    fixture.createEventDocuments.mockClear();
    await fixture.resumeWorkflow();
    const workflow = repository.workflowExecutions.get(executionId);
    expect(workflow?.status).toBe(ExecutionStatus.COMPLETED);
    expect(workflow?.context.output).toEqual({ message: 'chosen' });
    const steps = [...fixture.stepExecutionRepositoryMock.stepExecutions.values()];
    expect(steps.every((step) => isTerminalStatus(step.status))).toBe(true);
    assertTerminationRecords(fixture);
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
    assertTerminationRecords(fixture);
    expect(steps.find((step) => step.stepId === 'terminate')?.status).toBe(
      ExecutionStatus.COMPLETED
    );
  });
});
