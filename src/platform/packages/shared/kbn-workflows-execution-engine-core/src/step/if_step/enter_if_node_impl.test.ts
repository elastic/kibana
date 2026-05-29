/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterIfNode, EnterConditionBranchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type {
  IStepExecutionRuntime,
  IWorkflowExecutionRuntimeManager,
  IWorkflowEventLogger,
} from '../../..';
import { EnterIfNodeImpl } from './enter_if_node_impl';

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

// conditionResult: pass `true` or `false` (boolean) to control what
// renderValueWithContext returns — evaluateCondition handles booleans directly.
const makeStepRuntime = (conditionResult: boolean = true): IStepExecutionRuntime => {
  const contextManager = {
    getContext: jest.fn().mockReturnValue({}),
    renderValueAccordingToContext: jest.fn((v: unknown) => v),
    renderValueWithContext: jest.fn((_v: unknown, _ctx: unknown) => conditionResult),
    evaluateExpressionInContext: jest.fn(),
    evaluateBooleanExpressionInContext: jest.fn().mockReturnValue(conditionResult),
  };
  return {
    contextManager,
    stepLogger: makeLogger(),
    stepExecution: undefined,
    getCurrentStepState: jest.fn().mockReturnValue(undefined),
    setCurrentStepState: jest.fn(),
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

const makeThenNode = (id: string, condition: string): EnterConditionBranchNode =>
  ({ id, type: 'enter-then-branch', condition } as unknown as EnterConditionBranchNode);

const makeElseNode = (id: string): EnterConditionBranchNode =>
  ({ id, type: 'enter-else-branch' } as unknown as EnterConditionBranchNode);

const makeGraph = (successors: EnterConditionBranchNode[]): WorkflowGraph =>
  ({ getDirectSuccessors: jest.fn().mockReturnValue(successors) } as unknown as WorkflowGraph);

const makeIfNode = (exitNodeId = 'exit-if-1'): EnterIfNode =>
  ({
    id: 'enter-if-1',
    type: 'enter-if' as const,
    stepId: 'myIf',
    exitNodeId,
  } as unknown as EnterIfNode);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnterIfNodeImpl', () => {
  it('navigates to then branch when condition is true', async () => {
    const step = makeStepRuntime(true);
    const runtime = makeRuntimeManager();
    const thenNode = makeThenNode('then-1', 'alert.severity == "high"');
    const graph = makeGraph([thenNode]);

    const impl = new EnterIfNodeImpl(makeIfNode(), runtime, graph, step, makeLogger());
    await impl.run();

    expect(step.startStep).toHaveBeenCalledTimes(1);
    expect(runtime.navigateToNode).toHaveBeenCalledWith('then-1');
  });

  it('navigates to else branch when condition is false and else node exists', async () => {
    const step = makeStepRuntime(false);
    const runtime = makeRuntimeManager();
    const thenNode = makeThenNode('then-1', 'alert.severity == "high"');
    const elseNode = makeElseNode('else-1');
    const graph = makeGraph([thenNode, elseNode]);

    const impl = new EnterIfNodeImpl(makeIfNode(), runtime, graph, step, makeLogger());
    await impl.run();

    expect(runtime.navigateToNode).toHaveBeenCalledWith('else-1');
  });

  it('navigates to exit node when condition is false and no else branch', async () => {
    const step = makeStepRuntime(false);
    const runtime = makeRuntimeManager();
    const thenNode = makeThenNode('then-1', 'some.condition');
    const graph = makeGraph([thenNode]);
    const node = makeIfNode('exit-if-1');

    const impl = new EnterIfNodeImpl(node, runtime, graph, step, makeLogger());
    await impl.run();

    expect(runtime.navigateToNode).toHaveBeenCalledWith('exit-if-1');
  });

  it('throws when successors contain unsupported node types', async () => {
    const step = makeStepRuntime(true);
    const runtime = makeRuntimeManager();
    const badNode = { id: 'bad-1', type: 'enter-foreach' } as unknown as EnterConditionBranchNode;
    const graph = makeGraph([badNode]);

    const impl = new EnterIfNodeImpl(makeIfNode(), runtime, graph, step, makeLogger());
    await expect(impl.run()).rejects.toThrow(
      /must have only 'enter-then-branch' or 'enter-else-branch'/
    );
  });

  it('records input with rawCondition, rendered condition (boolean), and result', async () => {
    const step = makeStepRuntime(true);
    const runtime = makeRuntimeManager();
    const thenNode = makeThenNode('then-1', 'alert.severity == "high"');
    const graph = makeGraph([thenNode]);

    const impl = new EnterIfNodeImpl(makeIfNode(), runtime, graph, step, makeLogger());
    await impl.run();

    expect(step.setInput).toHaveBeenCalledWith(
      expect.objectContaining({
        rawCondition: 'alert.severity == "high"',
        condition: true,
        conditionResult: true,
      })
    );
  });
});
