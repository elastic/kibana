/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterRetryNode, ExitRetryNode } from '@kbn/workflows/graph';
import type {
  IStepExecutionRuntime,
  IWorkflowExecutionRuntimeManager,
  IWorkflowEventLogger,
} from '../../../..';
import { EnterRetryNodeImpl } from './enter_retry_node_impl';
import { ExitRetryNodeImpl } from './exit_retry_node_impl';

// ---------------------------------------------------------------------------
// In-memory fakes
// ---------------------------------------------------------------------------

const makeLogger = (): IWorkflowEventLogger => ({
  logEvent: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
  flushEvents: jest.fn().mockResolvedValue(undefined),
});

const makeContextManager = (shouldRetry = true) => ({
  getContext: jest.fn().mockReturnValue({}),
  renderValueAccordingToContext: jest.fn((v: unknown) => v),
  renderValueWithContext: jest.fn((v: unknown) => v),
  evaluateExpressionInContext: jest.fn(),
  evaluateBooleanExpressionInContext: jest.fn().mockReturnValue(shouldRetry),
});

const makeStepRuntime = (
  initialState: Record<string, unknown> | undefined = undefined,
  contextManagerShouldRetry = true
): IStepExecutionRuntime => {
  let stepState = initialState;
  return {
    contextManager: makeContextManager(contextManagerShouldRetry) as any,
    stepLogger: makeLogger(),
    stepExecution: undefined,
    getCurrentStepState: jest.fn(() => stepState),
    setCurrentStepState: jest.fn((s) => {
      stepState = s;
    }),
    setInput: jest.fn(),
    startStep: jest.fn(),
    finishStep: jest.fn(),
    failStep: jest.fn(),
    flushEventLogs: jest.fn().mockResolvedValue(undefined),
    tryEnterDelay: jest.fn().mockReturnValue(false),
    tryEnterWaitUntil: jest.fn().mockReturnValue(false),
    stepExecutionExists: jest.fn().mockReturnValue(false),
    getCurrentStepResult: jest.fn().mockReturnValue(undefined),
    abortController: { signal: new AbortController().signal, abort: jest.fn() },
    scopeStack: {
      isEmpty: jest.fn().mockReturnValue(true),
      getCurrentScope: jest.fn(),
      exitScope: jest.fn(),
      stackFrames: [],
    },
  } as unknown as IStepExecutionRuntime;
};

const makeRuntimeManager = (): IWorkflowExecutionRuntimeManager => ({
  getWorkflowExecution: jest.fn().mockReturnValue({}),
  navigateToNode: jest.fn(),
  navigateToNextNode: jest.fn(),
  navigateToAfterNode: jest.fn(),
  enterScope: jest.fn(),
  setWorkflowOutputs: jest.fn(),
  setWorkflowStatus: jest.fn(),
  setWorkflowCancelled: jest.fn(),
  setWorkflowError: jest.fn(),
  markWorkflowTimeouted: jest.fn(),
  unwindScopes: jest.fn(),
});

const makeEnterRetryNode = (overrides: Partial<EnterRetryNode> = {}): EnterRetryNode =>
  ({
    id: 'enter-retry-1',
    type: 'enter-retry' as const,
    stepId: 'myRetry',
    configuration: { 'max-attempts': 3 },
    ...overrides,
  } as EnterRetryNode);

const makeExitRetryNode = (overrides: Partial<ExitRetryNode> = {}): ExitRetryNode =>
  ({
    id: 'exit-retry-1',
    type: 'exit-retry' as const,
    stepId: 'myRetry',
    ...overrides,
  } as ExitRetryNode);

// ---------------------------------------------------------------------------
// EnterRetryNodeImpl
// ---------------------------------------------------------------------------

describe('EnterRetryNodeImpl', () => {
  describe('initial entry (no state)', () => {
    it('starts step, initializes attempt=0, enters scope and navigates', () => {
      const step = makeStepRuntime(undefined);
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode();

      new EnterRetryNodeImpl(node, step, runtime, makeLogger()).run();

      expect(step.startStep).toHaveBeenCalledTimes(1);
      expect(step.setCurrentStepState).toHaveBeenCalledWith({ attempt: 0 });
      expect(runtime.enterScope).toHaveBeenCalledWith('1-attempt');
      expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('advance retry (existing state)', () => {
    it('increments attempt, enters next scope and navigates', () => {
      const step = makeStepRuntime({ attempt: 0 });
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode();

      new EnterRetryNodeImpl(node, step, runtime, makeLogger()).run();

      expect(step.setCurrentStepState).toHaveBeenCalledWith({ attempt: 1 });
      expect(runtime.enterScope).toHaveBeenCalledWith('2-attempt');
      expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
    });

    it('enters delay and returns early when fixed delay is configured', () => {
      const step = makeStepRuntime({ attempt: 0 });
      (step.tryEnterDelay as jest.Mock).mockReturnValue(true);
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode({
        configuration: { 'max-attempts': 3, strategy: 'fixed', delay: '1s' },
      });

      new EnterRetryNodeImpl(node, step, runtime, makeLogger()).run();

      expect(step.tryEnterDelay).toHaveBeenCalledWith('1s');
      expect(runtime.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('resumes after fixed delay wait without re-entering delay', () => {
      // resumeAt means the wait period already passed
      const step = makeStepRuntime({ attempt: 0, resumeAt: '2025-01-01T00:00:00Z' });
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode({
        configuration: { 'max-attempts': 3, strategy: 'fixed', delay: '1s' },
      });

      new EnterRetryNodeImpl(node, step, runtime, makeLogger()).run();

      expect(step.tryEnterDelay).not.toHaveBeenCalled();
      expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
    });
  });

  describe('catchError', () => {
    it('navigates to retry node and clears error when attempt < max-attempts', () => {
      const retryStep = makeStepRuntime({ attempt: 0 });
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode({ configuration: { 'max-attempts': 3 } });
      const impl = new EnterRetryNodeImpl(node, retryStep, runtime, makeLogger());

      const failedStep = makeStepRuntime(undefined);
      (failedStep.contextManager.evaluateBooleanExpressionInContext as jest.Mock).mockReturnValue(
        true
      );
      impl.catchError(failedStep);

      expect(runtime.navigateToNode).toHaveBeenCalledWith('enter-retry-1');
      expect(runtime.setWorkflowError).toHaveBeenCalledWith(undefined);
    });

    it('fails retry step with last error when max-attempts is exhausted', () => {
      // attempt: 3, max-attempts: 3 → 3 < 3 is false → falls through to failStep
      const retryStep = makeStepRuntime({ attempt: 3 });
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode({ configuration: { 'max-attempts': 3 } });
      const impl = new EnterRetryNodeImpl(node, retryStep, runtime, makeLogger());

      const failedStep = makeStepRuntime(undefined);
      (failedStep.contextManager.evaluateBooleanExpressionInContext as jest.Mock).mockReturnValue(
        true
      );
      // Simulate a serialized error on the failed step
      (failedStep as any).stepExecution = { error: { message: 'boom' } };
      (failedStep.getCurrentStepResult as jest.Mock).mockReturnValue({
        input: {},
        output: {},
        error: { message: 'boom' },
      });

      impl.catchError(failedStep);

      expect(retryStep.failStep).toHaveBeenCalledWith(expect.any(Error));
      expect(runtime.setWorkflowError).not.toHaveBeenCalled();
    });

    it('propagates error without retrying when shouldRetry condition is false', () => {
      const retryStep = makeStepRuntime({ attempt: 0 }, false);
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode();
      const impl = new EnterRetryNodeImpl(node, retryStep, runtime, makeLogger());

      const failedStep = makeStepRuntime(undefined, false);
      impl.catchError(failedStep);

      expect(runtime.navigateToNode).not.toHaveBeenCalled();
      expect(runtime.setWorkflowError).not.toHaveBeenCalled();
      expect(retryStep.failStep).not.toHaveBeenCalled();
    });

    it('throws when retry state is missing during catchError', () => {
      const retryStep = makeStepRuntime(undefined);
      const runtime = makeRuntimeManager();
      const node = makeEnterRetryNode();
      const impl = new EnterRetryNodeImpl(node, retryStep, runtime, makeLogger());

      const failedStep = makeStepRuntime(undefined);
      (failedStep.contextManager.evaluateBooleanExpressionInContext as jest.Mock).mockReturnValue(
        true
      );

      expect(() => impl.catchError(failedStep)).toThrow(/Retry state missing/);
    });
  });
});

// ---------------------------------------------------------------------------
// ExitRetryNodeImpl
// ---------------------------------------------------------------------------

describe('ExitRetryNodeImpl', () => {
  it('finishes step, clears state and navigates to next node', async () => {
    const step = makeStepRuntime({ attempt: 2 });
    const runtime = makeRuntimeManager();
    const node = makeExitRetryNode();

    await new ExitRetryNodeImpl(node, step, runtime, makeLogger()).run();

    expect(step.finishStep).toHaveBeenCalledTimes(1);
    expect(step.setCurrentStepState).toHaveBeenCalledWith(undefined);
    expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });

  it('still navigates when retry state is absent', async () => {
    const step = makeStepRuntime(undefined);
    const runtime = makeRuntimeManager();
    const node = makeExitRetryNode();

    await new ExitRetryNodeImpl(node, step, runtime, makeLogger()).run();

    expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });
});
