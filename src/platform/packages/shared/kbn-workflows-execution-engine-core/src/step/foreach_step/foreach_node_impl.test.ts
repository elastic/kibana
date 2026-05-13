/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterForeachNode, ExitForeachNode } from '@kbn/workflows/graph';
import type {
  IStepExecutionRuntime,
  IWorkflowExecutionRuntimeManager,
  IWorkflowEventLogger,
  IWorkflowExecutionState,
} from '../../..';
import { EnterForeachNodeImpl } from './enter_foreach_node_impl';
import { ExitForeachNodeImpl } from './exit_foreach_node_impl';

// ---------------------------------------------------------------------------
// Minimal in-memory fakes — no jest.mock(), no plugin imports
// ---------------------------------------------------------------------------

const makeLogger = (): IWorkflowEventLogger => ({
  logEvent: jest.fn(),
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
  logDebug: jest.fn(),
  flushEvents: jest.fn().mockResolvedValue(undefined),
});

const makeContextManager = (overrides: Record<string, unknown> = {}) => ({
  getContext: jest.fn().mockReturnValue({}),
  renderValueAccordingToContext: jest.fn((v: unknown) => v),
  renderValueWithContext: jest.fn((v: unknown) => v),
  evaluateExpressionInContext: jest.fn((expr: string) => overrides[expr] ?? expr),
  evaluateBooleanExpressionInContext: jest.fn().mockReturnValue(true),
});

const makeStepRuntime = (
  contextManagerOverrides: Record<string, unknown> = {}
): IStepExecutionRuntime => {
  let stepState: Record<string, unknown> | undefined;
  return {
    contextManager: makeContextManager(contextManagerOverrides) as any,
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

const makeWorkflowExecutionState = (): IWorkflowExecutionState => ({
  evictStaleLoopOutputs: jest.fn(),
});

const makeWorkflowGraph = (innerStepIds: string[] = []) => ({
  getInnerStepIds: jest.fn().mockReturnValue(new Set(innerStepIds)),
});

const makeEnterForeachNode = (overrides: Partial<EnterForeachNode> = {}): EnterForeachNode =>
  ({
    id: 'enter-foreach-1',
    type: 'enter-foreach' as const,
    stepId: 'myForeach',
    exitNodeId: 'exit-foreach-1',
    configuration: { foreach: ['a', 'b', 'c'] },
    ...overrides,
  } as EnterForeachNode);

const makeExitForeachNode = (overrides: Partial<ExitForeachNode> = {}): ExitForeachNode =>
  ({
    id: 'exit-foreach-1',
    type: 'exit-foreach' as const,
    stepId: 'myForeach',
    startNodeId: 'enter-foreach-1',
    ...overrides,
  } as ExitForeachNode);

// ---------------------------------------------------------------------------
// EnterForeachNodeImpl
// ---------------------------------------------------------------------------

describe('EnterForeachNodeImpl', () => {
  describe('initial entry (no existing state)', () => {
    it('starts the step and enters the first iteration scope', async () => {
      const step = makeStepRuntime();
      const runtime = makeRuntimeManager();
      const logger = makeLogger();
      const node = makeEnterForeachNode();

      const impl = new EnterForeachNodeImpl(node, runtime, step, logger);
      await impl.run();

      expect(step.startStep).toHaveBeenCalledTimes(1);
      expect(step.setCurrentStepState).toHaveBeenCalledWith({ index: 0, total: 3 });
      expect(runtime.enterScope).toHaveBeenCalledWith('0');
      expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
    });

    it('skips iteration and navigates to exit node when items array is empty', async () => {
      const step = makeStepRuntime();
      const runtime = makeRuntimeManager();
      const logger = makeLogger();
      const node = makeEnterForeachNode({ configuration: { foreach: [] } });

      const impl = new EnterForeachNodeImpl(node, runtime, step, logger);
      await impl.run();

      expect(step.finishStep).toHaveBeenCalledTimes(1);
      expect(runtime.navigateToNode).toHaveBeenCalledWith(node.exitNodeId);
      expect(runtime.enterScope).not.toHaveBeenCalled();
    });

    it('parses a JSON string foreach expression', async () => {
      const step = makeStepRuntime();
      const runtime = makeRuntimeManager();
      const logger = makeLogger();
      const node = makeEnterForeachNode({
        configuration: { foreach: JSON.stringify([1, 2]) },
      });

      const impl = new EnterForeachNodeImpl(node, runtime, step, logger);
      await impl.run();

      expect(step.setCurrentStepState).toHaveBeenCalledWith({ index: 0, total: 2 });
    });

    it('throws when foreach resolves to a non-array', async () => {
      const step = makeStepRuntime();
      const runtime = makeRuntimeManager();
      const logger = makeLogger();
      const node = makeEnterForeachNode({
        configuration: { foreach: JSON.stringify({ not: 'an array' }) },
      });

      const impl = new EnterForeachNodeImpl(node, runtime, step, logger);
      await expect(impl.run()).rejects.toThrow(/Foreach expression must evaluate to an array/);
    });
  });

  describe('advance iteration (existing state)', () => {
    it('increments the index and enters the next scope', async () => {
      const step = makeStepRuntime();
      // Simulate step already started: state has index 0
      (step.getCurrentStepState as jest.Mock).mockReturnValue({ index: 0, total: 3 });
      const runtime = makeRuntimeManager();
      const logger = makeLogger();
      const node = makeEnterForeachNode();

      const impl = new EnterForeachNodeImpl(node, runtime, step, logger);
      await impl.run();

      expect(step.setCurrentStepState).toHaveBeenCalledWith({ index: 1, total: 3 });
      expect(runtime.enterScope).toHaveBeenCalledWith('1');
      expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// ExitForeachNodeImpl
// ---------------------------------------------------------------------------

describe('ExitForeachNodeImpl', () => {
  const makeImpl = (
    node: ExitForeachNode,
    step: IStepExecutionRuntime,
    runtime: IWorkflowExecutionRuntimeManager,
    logger: IWorkflowEventLogger,
    execState: IWorkflowExecutionState,
    graph: ReturnType<typeof makeWorkflowGraph>
  ) => new ExitForeachNodeImpl(node, step, runtime, logger, execState, graph as any);

  it('navigates back to start node when more items remain', () => {
    const step = makeStepRuntime();
    (step.getCurrentStepState as jest.Mock).mockReturnValue({ index: 0, total: 3 });
    const runtime = makeRuntimeManager();
    const node = makeExitForeachNode({ startNodeId: 'enter-foreach-1' });
    const execState = makeWorkflowExecutionState();
    const graph = makeWorkflowGraph();

    const impl = makeImpl(node, step, runtime, makeLogger(), execState, graph);
    impl.run();

    expect(runtime.navigateToNode).toHaveBeenCalledWith('enter-foreach-1');
    expect(step.finishStep).not.toHaveBeenCalled();
  });

  it('finishes step and navigates to next node after last item', () => {
    const step = makeStepRuntime();
    (step.getCurrentStepState as jest.Mock).mockReturnValue({ index: 2, total: 3 });
    const runtime = makeRuntimeManager();
    const node = makeExitForeachNode();
    const execState = makeWorkflowExecutionState();
    const graph = makeWorkflowGraph(['inner-step-1']);

    const impl = makeImpl(node, step, runtime, makeLogger(), execState, graph);
    impl.run();

    expect(step.finishStep).toHaveBeenCalledTimes(1);
    expect(execState.evictStaleLoopOutputs).toHaveBeenCalledTimes(1);
    expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });

  it('throws when maxIterations is hit and onLimit is "fail"', () => {
    const step = makeStepRuntime();
    // index 1 means nextIndex = 2, total = 5 (has more items), maxIterations = 2
    (step.getCurrentStepState as jest.Mock).mockReturnValue({ index: 1, total: 5 });
    const runtime = makeRuntimeManager();
    const node = makeExitForeachNode({ maxIterations: 2, onLimit: 'fail' });
    const execState = makeWorkflowExecutionState();
    const graph = makeWorkflowGraph();

    const impl = makeImpl(node, step, runtime, makeLogger(), execState, graph);
    expect(() => impl.run()).toThrow(/exceeded max-iterations limit/);
    expect(execState.evictStaleLoopOutputs).toHaveBeenCalledTimes(1);
  });

  it('stops gracefully when maxIterations is hit and onLimit is not "fail"', () => {
    const step = makeStepRuntime();
    (step.getCurrentStepState as jest.Mock).mockReturnValue({ index: 1, total: 5 });
    const runtime = makeRuntimeManager();
    const node = makeExitForeachNode({ maxIterations: 2, onLimit: 'continue' });
    const execState = makeWorkflowExecutionState();
    const graph = makeWorkflowGraph();

    const impl = makeImpl(node, step, runtime, makeLogger(), execState, graph);
    expect(() => impl.run()).not.toThrow();
    expect(step.finishStep).toHaveBeenCalledTimes(1);
    expect(runtime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });

  it('throws when foreach state is missing', () => {
    const step = makeStepRuntime();
    (step.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
    const node = makeExitForeachNode();
    const impl = makeImpl(
      node,
      step,
      makeRuntimeManager(),
      makeLogger(),
      makeWorkflowExecutionState(),
      makeWorkflowGraph()
    );
    expect(() => impl.run()).toThrow(/Foreach state for step .* not found/);
  });
});
