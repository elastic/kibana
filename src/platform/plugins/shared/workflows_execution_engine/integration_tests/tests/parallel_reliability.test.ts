/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { NodesFactory } from '../../server/step/nodes_factory';
import type { StepExecutionRuntime } from '../../server/workflow_context_manager/step_execution_runtime';
import { FakeConnectors } from '../mocks/actions_plugin_mock';
import { WorkflowRunFixture } from '../workflow_run_fixture';

const executionId = 'fake_workflow_execution_id';
const getWorkflow = (fixture: WorkflowRunFixture) =>
  fixture.workflowExecutionRepositoryMock.workflowExecutions.get(executionId);
const steps = (fixture: WorkflowRunFixture, stepId: string) =>
  [...fixture.stepExecutionRepositoryMock.stepExecutions.values()].filter(
    (step) => step.stepId === stepId
  );
const deferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const drain = async (fixture: WorkflowRunFixture) => {
  for (
    let tick = 0;
    tick < 30 && getWorkflow(fixture)?.status === ExecutionStatus.WAITING;
    tick++
  ) {
    await fixture.resumeWorkflow();
  }
};

afterEach(() => jest.restoreAllMocks());

describe('parallel execution reliability', () => {
  it('runs nested joins with a workflow-wide operation limit of one', async () => {
    const fixture = new WorkflowRunFixture();
    jest.replaceProperty(fixture.configMock.parallel, 'maxConcurrentOperations', 1);
    const create = NodesFactory.prototype.create;
    let active = 0;
    let peak = 0;
    let completed = 0;
    jest
      .spyOn(NodesFactory.prototype, 'create')
      .mockImplementation(function (this: NodesFactory, runtime) {
        const implementation = create.call(this, runtime);
        if (runtime.node.stepId !== 'effect') return implementation;
        return {
          ...implementation,
          run: async () => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 5));
            await implementation.run();
            active--;
            completed++;
          },
        };
      });
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: outer
    type: parallel
    foreach: '[1, 2, 3]'
    steps:
      - name: inner
        type: parallel
        foreach: '[1, 2, 3]'
        steps:
          - name: effect
            type: console
            with: { message: done }
`,
    });
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(completed).toBe(9);
    expect(peak).toBe(1);
  });

  it('aborts the actual nested runtime and fences writes from an operation that ignores abort', async () => {
    const fixture = new WorkflowRunFixture();
    const entered = deferred();
    const finish = deferred();
    let activeRuntime: StepExecutionRuntime | undefined;
    const onCancel = jest.fn();
    const create = NodesFactory.prototype.create;
    jest
      .spyOn(NodesFactory.prototype, 'create')
      .mockImplementation(function (this: NodesFactory, runtime) {
        if (runtime.node.stepId !== 'effect') return create.call(this, runtime);
        return {
          run: async () => {
            activeRuntime = runtime;
            runtime.startStep();
            entered.resolve();
            await finish.promise;
            runtime.finishStep('late result');
            runtime.setCurrentStepState({ late: true });
          },
          onCancel,
        };
      });
    const run = fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: outer
    type: parallel
    foreach: '[1]'
    steps:
      - name: inner
        type: parallel
        foreach: '[1]'
        steps:
          - name: effect
            type: console
            with: { message: pending }
`,
    });
    await entered.promise;
    fixture.taskAbortController.abort();
    await run;
    expect(activeRuntime?.abortController.signal.aborted).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
    const snapshot = structuredClone(steps(fixture, 'effect'));
    finish.resolve();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(steps(fixture, 'effect')).toEqual(snapshot);
    expect(activeRuntime?.stepExecution?.state).not.toEqual({ late: true });
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.CANCELLED);
  });

  it('retains branch admission across transition yields with count-waiting:false', async () => {
    const fixture = new WorkflowRunFixture();
    jest.replaceProperty(fixture.configMock.parallel, 'maxTransitionsPerTick', 1);
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: parallelWork
    type: parallel
    foreach: '["a", "b"]'
    concurrency: { max: 1, count-waiting: false }
    steps:
      - name: first
        type: console
        with: { message: '{{ foreach.item }}' }
      - name: second
        type: console
        with: { message: '{{ foreach.item }}' }
      - name: third
        type: console
        with: { message: '{{ foreach.item }}' }
`,
    });
    expect(steps(fixture, 'first').map((step) => step.output)).toEqual(['a']);
    await fixture.resumeWorkflow();
    expect(steps(fixture, 'first').map((step) => step.output)).toEqual(['a']);
    expect(steps(fixture, 'second').map((step) => step.output)).toEqual(['a']);
    await drain(fixture);
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(steps(fixture, 'third').map((step) => step.output)).toEqual(['a', 'b']);
  });

  it('recovers a committed side effect when its parent branch cursor was not saved', async () => {
    const fixture = new WorkflowRunFixture();
    const repository = fixture.stepExecutionRepositoryMock;
    const bulkUpsert = repository.bulkUpsert.bind(repository);
    let snapshot:
      | { workflow: EsWorkflowExecution; steps: Map<string, EsWorkflowStepExecution> }
      | undefined;
    jest.spyOn(repository, 'bulkUpsert').mockImplementation(async (updates) => {
      await bulkUpsert(structuredClone(updates));
      if (!snapshot && updates.some((step) => step.executionCheckpoint?.nodeId === 'effect')) {
        const workflow = getWorkflow(fixture);
        if (!workflow) throw new Error('Missing workflow');
        snapshot = structuredClone({ workflow, steps: repository.stepExecutions });
      }
    });
    let calls = 0;
    const create = NodesFactory.prototype.create;
    jest
      .spyOn(NodesFactory.prototype, 'create')
      .mockImplementation(function (this: NodesFactory, runtime) {
        const implementation = create.call(this, runtime);
        if (runtime.node.stepId !== 'effect') return implementation;
        return {
          ...implementation,
          run: async () => {
            calls++;
            await implementation.run();
          },
        };
      });
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: parallelWork
    type: parallel
    foreach: '[1]'
    steps:
      - name: effect
        type: console
        with: { message: persisted }
      - name: afterEffect
        type: console
        with: { message: continued }
`,
    });
    if (!snapshot) throw new Error('Did not observe the node commit boundary');
    expect(calls).toBe(1);
    repository.stepExecutions.clear();
    for (const [id, step] of snapshot.steps) repository.stepExecutions.set(id, step);
    fixture.workflowExecutionRepositoryMock.workflowExecutions.set(executionId, snapshot.workflow);
    await fixture.resumeWorkflow();
    await drain(fixture);
    expect(calls).toBe(1);
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
    expect(steps(fixture, 'afterEffect')[0].output).toBe('continued');
  });
  it('persists a completed result only together with its recovery transition', async () => {
    const fixture = new WorkflowRunFixture();
    const completed = deferred();
    const finish = deferred();
    const create = NodesFactory.prototype.create;
    jest
      .spyOn(NodesFactory.prototype, 'create')
      .mockImplementation(function (this: NodesFactory, runtime) {
        const implementation = create.call(this, runtime);
        if (runtime.node.stepId !== 'effect') return implementation;
        return {
          ...implementation,
          run: async () => {
            await implementation.run();
            completed.resolve();
            await finish.promise;
          },
        };
      });
    const run = fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: parallelWork
    type: parallel
    foreach: '[1]'
    steps:
      - name: effect
        type: console
        with: { message: result }
`,
    });
    await completed.promise;
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(steps(fixture, 'effect')[0].status).not.toBe(ExecutionStatus.COMPLETED);
    expect(steps(fixture, 'effect')[0].output).toBeUndefined();
    finish.resolve();
    await run;
    expect(steps(fixture, 'effect')[0]).toMatchObject({
      status: ExecutionStatus.COMPLETED,
      output: 'result',
      executionCheckpoint: { nodeId: 'effect', status: 'completed' },
    });
  });

  it('restores fallback scope updates from the node commit after a partial bulk write', async () => {
    const fixture = new WorkflowRunFixture();
    const repository = fixture.stepExecutionRepositoryMock;
    const bulkUpsert = repository.bulkUpsert.bind(repository);
    let snapshot:
      | { workflow: EsWorkflowExecution; steps: Map<string, EsWorkflowStepExecution> }
      | undefined;
    jest.spyOn(repository, 'bulkUpsert').mockImplementation(async (updates) => {
      await bulkUpsert(structuredClone(updates));
      if (!snapshot && updates.some((step) => step.executionCheckpoint?.nodeId === 'flaky')) {
        const workflow = getWorkflow(fixture);
        if (!workflow) throw new Error('Missing workflow');
        snapshot = structuredClone({ workflow, steps: repository.stepExecutions });
      }
    });
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: parallelWork
    type: parallel
    mode: settled
    foreach: '[1]'
    steps:
      - name: flaky
        type: ${FakeConnectors.constantlyFailing.actionTypeId}
        connector-id: ${FakeConnectors.constantlyFailing.name}
        with: { message: fail }
        on-failure:
          fallback:
            - name: fallback
              type: console
              with: { message: recovered }
`,
    });
    if (!snapshot) throw new Error('Did not observe the failure transition commit');
    const callsBeforeResume = fixture.unsecuredActionsClientMock.execute.mock.calls.length;
    repository.stepExecutions.clear();
    for (const [id, step] of snapshot.steps) repository.stepExecutions.set(id, step);
    fixture.workflowExecutionRepositoryMock.workflowExecutions.set(executionId, snapshot.workflow);
    await fixture.resumeWorkflow();
    await drain(fixture);
    expect(fixture.unsecuredActionsClientMock.execute.mock.calls.length).toBe(callsBeforeResume);
    expect(steps(fixture, 'fallback')[0].output).toBe('recovered');
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.COMPLETED);
  });

  it('rejects nested fan-out that exceeds the workflow-wide outstanding branch limit', async () => {
    const fixture = new WorkflowRunFixture();
    jest.replaceProperty(fixture.configMock.parallel, 'maxOutstandingBranches', 3);
    await fixture.runWorkflow({
      workflowYaml: `
steps:
  - name: outer
    type: parallel
    foreach: '[1, 2]'
    steps:
      - name: inner
        type: parallel
        foreach: '[1, 2]'
        steps:
          - name: effect
            type: console
            with: { message: bounded }
`,
    });
    expect(getWorkflow(fixture)?.status).toBe(ExecutionStatus.FAILED);
    expect(getWorkflow(fixture)?.error?.message).toContain('outstanding branches');
    expect(steps(fixture, 'effect')).toHaveLength(0);
  });
  it('stops before the next side effect when a checkpoint write fails', async () => {
    const fixture = new WorkflowRunFixture();
    const repository = fixture.stepExecutionRepositoryMock;
    const bulkUpsert = repository.bulkUpsert.bind(repository);
    jest.spyOn(repository, 'bulkUpsert').mockImplementation(async (updates) => {
      if (updates.some((step) => step.executionCheckpoint?.nodeId === 'first')) {
        throw new Error('Checkpoint storage unavailable');
      }
      await bulkUpsert(structuredClone(updates));
    });
    const started: string[] = [];
    const create = NodesFactory.prototype.create;
    jest
      .spyOn(NodesFactory.prototype, 'create')
      .mockImplementation(function (this: NodesFactory, runtime) {
        const implementation = create.call(this, runtime);
        if (runtime.node.type !== 'atomic') return implementation;
        return {
          ...implementation,
          run: async () => {
            started.push(runtime.node.stepId);
            await implementation.run();
          },
        };
      });
    await expect(
      fixture.runWorkflow({
        workflowYaml: `
steps:
  - name: parallelWork
    type: parallel
    foreach: '[1]'
    steps:
      - name: first
        type: console
        with: { message: committed externally }
      - name: second
        type: console
        with: { message: must not start }
`,
      })
    ).rejects.toThrow('Checkpoint storage unavailable');
    expect(started).toEqual(['first']);
  });
});
