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

describe.each(['waitForInput', 'waitForApproval'])('notifications around %s', (stepType) => {
  let fixture: WorkflowRunFixture;
  const now = new Date('2026-09-14T12:00:00Z');
  const execution = () => {
    const document = fixture.workflowExecutionRepositoryMock.workflowExecutions.get(
      'fake_workflow_execution_id'
    );
    if (!document) throw new Error('Expected persisted execution');
    return document;
  };
  const steps = () => Array.from(fixture.stepExecutionRepositoryMock.stepExecutions.values());
  beforeEach(async () => {
    jest.useFakeTimers({ now });
    fixture = new WorkflowRunFixture();
    const repository = fixture.workflowExecutionRepositoryMock;
    const update = repository.updateWorkflowExecution.bind(repository);
    jest.spyOn(repository, 'updateWorkflowExecution').mockImplementation((patch, options) => {
      // Model ES context merging: an omitted resumeInput does not remove the persisted key.
      const previous = patch.id ? repository.workflowExecutions.get(patch.id) : undefined;
      return update(
        patch.context === undefined
          ? patch
          : {
              ...patch,
              context: { ...previous?.context, ...patch.context },
            },
        options
      );
    });
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: fanout
    type: parallel
    foreach: '["a", "b"]'
    steps:
      - name: branch
        type: console
        with:
          message: done
  - name: first
    type: ${stepType}
    timeout: 1h
    with:
      message: Continue?
  - name: second
    type: ${stepType}
    timeout: 1h
    with:
      message: Continue again?
  - name: after
    type: console
    with:
      message: finished
`,
    });
  });
  afterEach(() => jest.useRealTimers());

  it('ignores late notifications before input and after advancing to the next HITL step', async () => {
    expect(execution().status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    for (let index = 0; index < 3; index++) {
      expect(await fixture.resumeWorkflow()).toEqual({
        retryAt: new Date(now.getTime() + 3_600_000),
      });
      expect(execution().status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
      expect(steps().find((step) => step.stepId === 'first')?.status).toBe(
        ExecutionStatus.WAITING_FOR_INPUT
      );
      expect(steps().some((step) => step.stepId === 'second')).toBe(false);
    }
    execution().context = {
      ...execution().context,
      resumeInput: stepType === 'waitForInput' ? {} : { approved: true },
    };
    await fixture.resumeWorkflow();
    expect(execution().status).toBe(ExecutionStatus.WAITING_FOR_INPUT);
    expect(execution().context?.resumeInput).toBeNull();
    await fixture.resumeWorkflow();
    expect(steps().find((step) => step.stepId === 'second')?.status).toBe(
      ExecutionStatus.WAITING_FOR_INPUT
    );
    expect(steps().some((step) => step.stepId === 'after')).toBe(false);
    execution().context = {
      ...execution().context,
      resumeInput: stepType === 'waitForInput' ? {} : { approved: true },
    };
    await fixture.resumeWorkflow();
    expect(execution().status).toBe(ExecutionStatus.COMPLETED);
  });

  it('still enforces the HITL deadline without input', async () => {
    jest.setSystemTime(new Date(now.getTime() + 3_600_000));
    await fixture.resumeWorkflow();
    expect(execution().status).toBe(ExecutionStatus.FAILED);
    expect(steps().some((step) => step.stepId === 'second')).toBe(false);
  });

  it('does not park cancellation behind the input gate', async () => {
    execution().cancelRequested = true;
    await fixture.resumeWorkflow();
    expect(execution().status).toBe(ExecutionStatus.CANCELLED);
  });
});
