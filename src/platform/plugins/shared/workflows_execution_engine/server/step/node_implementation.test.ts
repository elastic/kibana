/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BaseAtomicNodeImplementation, isCancellableNode } from './node_implementation';
import type { BaseStep, RunStepResult } from './node_implementation';

jest.mock('elastic-apm-node', () => ({
  __esModule: true,
  default: {
    startSpan: jest.fn(() => ({
      setLabel: jest.fn(),
      setOutcome: jest.fn(),
      end: jest.fn(),
    })),
  },
}));

const createStepExecutionRuntime = (overrides: Record<string, unknown> = {}) => ({
  abortController: new AbortController(),
  startStep: jest.fn(),
  flushEventLogs: jest.fn().mockResolvedValue(undefined),
  finishStep: jest.fn(),
  failStep: jest.fn(),
  setInput: jest.fn(),
  stepExecutionId: 'step-exec-1',
  node: { configuration: {} },
  workflowExecution: { workflowDefinition: {} },
  contextManager: {
    getDependencies: jest.fn(() => ({ config: {} })),
  },
  ...overrides,
});

const createWorkflowRuntime = () => ({
  navigateToNextNode: jest.fn(),
});

class TestStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
  public mockResult: RunStepResult = { input: {}, output: { data: 'ok' }, error: undefined };

  protected async _run(input: Record<string, unknown>): Promise<RunStepResult> {
    return this.mockResult;
  }
}

describe('isCancellableNode', () => {
  it('returns true when node has an onCancel method', () => {
    const node = { run: jest.fn(), onCancel: jest.fn() };
    expect(isCancellableNode(node)).toBe(true);
  });

  it('returns false when node does not have onCancel', () => {
    const node = { run: jest.fn() };
    expect(isCancellableNode(node)).toBe(false);
  });
});

describe('BaseAtomicNodeImplementation', () => {
  it('runs a step and navigates to the next node on success', async () => {
    const step: BaseStep = { name: 'test-step', stepId: 'test-step', type: 'atomic' };
    const runtime = createStepExecutionRuntime();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    await impl.run();

    expect(runtime.startStep).toHaveBeenCalled();
    expect(runtime.finishStep).toHaveBeenCalledWith({ data: 'ok' });
    expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });

  it('calls failStep when _run returns an error', async () => {
    const step: BaseStep = { name: 'test-step', stepId: 'test-step', type: 'atomic' };
    const runtime = createStepExecutionRuntime();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    impl.mockResult = {
      input: {},
      output: undefined,
      error: { type: 'TestError', message: 'something went wrong' },
    };
    await impl.run();

    expect(runtime.failStep).toHaveBeenCalled();
    expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });

  it('skips execution when already aborted', async () => {
    const step: BaseStep = { name: 'test-step', stepId: 'test-step', type: 'atomic' };
    const runtime = createStepExecutionRuntime();
    runtime.abortController.abort();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    await impl.run();

    expect(runtime.startStep).not.toHaveBeenCalled();
    expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });

  it('handles exceptions thrown during _run', async () => {
    const step: BaseStep = { name: 'test-step', stepId: 'test-step', type: 'atomic' };
    const runtime = createStepExecutionRuntime();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    impl.mockResult = null as any;
    // Override _run to throw
    (impl as any)._run = jest.fn().mockRejectedValue(new Error('kaboom'));

    await impl.run();

    expect(runtime.failStep).toHaveBeenCalled();
    expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });

  it('bridges stepId to name when name is missing', () => {
    const step = { name: '', stepId: 'my-step', type: 'atomic' } as BaseStep;
    const runtime = createStepExecutionRuntime();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    expect(impl.getName()).toBe('my-step');
  });

  it('auto-populates max-step-size from node configuration', () => {
    const step = { name: 'test', stepId: 'test', type: 'atomic' } as BaseStep;
    const runtime = createStepExecutionRuntime({
      node: { configuration: { 'max-step-size': '5mb' } },
    });
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    expect((impl as any).step['max-step-size']).toBe('5mb');
  });

  it('does not abort-skip when aborted during _run execution', async () => {
    const step: BaseStep = { name: 'test-step', stepId: 'test-step', type: 'atomic' };
    const runtime = createStepExecutionRuntime();
    const workflowRuntime = createWorkflowRuntime();

    const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
    (impl as any)._run = jest.fn(async () => {
      runtime.abortController.abort();
      return { input: {}, output: 'partial', error: undefined };
    });

    await impl.run();

    // When aborted during run, finishStep should NOT be called
    expect(runtime.finishStep).not.toHaveBeenCalled();
  });

  describe('getMaxResponseBytes', () => {
    it('uses step-level max-step-size', () => {
      const step = {
        name: 'test',
        stepId: 'test',
        type: 'atomic',
        'max-step-size': '5mb',
      } as BaseStep;
      const runtime = createStepExecutionRuntime();
      const workflowRuntime = createWorkflowRuntime();

      const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
      expect((impl as any).getMaxResponseBytes()).toBe(5 * 1024 * 1024);
    });

    it('falls back to workflow-level max-step-size', () => {
      const step = { name: 'test', stepId: 'test', type: 'atomic' } as BaseStep;
      const runtime = createStepExecutionRuntime({
        workflowExecution: {
          workflowDefinition: { settings: { 'max-step-size': '2mb' } },
        },
      });
      const workflowRuntime = createWorkflowRuntime();

      const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
      expect((impl as any).getMaxResponseBytes()).toBe(2 * 1024 * 1024);
    });

    it('falls back to DEFAULT_MAX_STEP_SIZE when nothing is configured', () => {
      const step = { name: 'test', stepId: 'test', type: 'atomic' } as BaseStep;
      const runtime = createStepExecutionRuntime();
      const workflowRuntime = createWorkflowRuntime();

      const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
      expect((impl as any).getMaxResponseBytes()).toBe(10 * 1024 * 1024);
    });
  });

  describe('handleFailure', () => {
    it('wraps errors into ExecutionError format', () => {
      const step = { name: 'test', stepId: 'test', type: 'atomic' } as BaseStep;
      const runtime = createStepExecutionRuntime();
      const workflowRuntime = createWorkflowRuntime();

      const impl = new TestStepImpl(step, runtime as any, undefined, workflowRuntime as any);
      const result = (impl as any).handleFailure({ key: 'val' }, new Error('test failure'));
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('test failure');
      expect(result.input).toEqual({ key: 'val' });
    });
  });
});
