/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';

import { runNode } from './run_node';
import { runStackMonitor } from './run_stack_monitor/run_stack_monitor';
import type { WorkflowExecutionLoopParams } from './types';
import type { BaseStep, RunStepResult } from '../step/node_implementation';
import { BaseAtomicNodeImplementation } from '../step/node_implementation';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';
import { createMockWorkflowEventLogger } from '../workflow_event_logger/mocks';

interface FakeSpan {
  name: string;
  parent: FakeSpan | undefined;
  setLabel: () => void;
  setOutcome: () => void;
  end: () => void;
}

interface FakeApm {
  startSpan: (name: string) => FakeSpan;
  readonly currentSpan: FakeSpan | undefined;
  startedSpans: FakeSpan[];
}

// The real agent cannot run under Jest, so this fake copies its run-context rule:
// startSpan and span.end() replace the span stack of the *current* async context
// (AsyncLocalStorage.enterWith), the same as the agent's supersedeRunContext.
jest.mock('elastic-apm-node', () => {
  const { AsyncLocalStorage } = jest.requireActual('async_hooks');
  const storage = new AsyncLocalStorage();
  const getStack = (): FakeSpan[] => storage.getStore() ?? [];

  const fakeApm: FakeApm = {
    startedSpans: [],
    get currentSpan() {
      return getStack().at(-1);
    },
    startSpan(name) {
      const span: FakeSpan = {
        name,
        parent: getStack().at(-1),
        setLabel: () => {},
        setOutcome: () => {},
        end: () => storage.enterWith(getStack().filter((s) => s !== span)),
      };
      fakeApm.startedSpans.push(span);
      storage.enterWith([...getStack(), span]);
      return span;
    },
  };
  return { __esModule: true, default: fakeApm };
});
jest.mock('./run_stack_monitor/run_stack_monitor');
jest.mock('./catch_error');
jest.mock('./handle_execution_delay');

const fakeApm = jest.requireMock<{ default: FakeApm }>('elastic-apm-node').default;

const STEP_COUNT = 3;

class TestStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
  protected async _run(): Promise<RunStepResult> {
    return { input: {}, output: { data: 'ok' }, error: undefined };
  }
}

const createStepExecutionRuntime = () =>
  ({
    abortController: new AbortController(),
    startStep: jest.fn(),
    finishStep: jest.fn(),
    failStep: jest.fn(),
    setInput: jest.fn(),
    stepExecutionId: 'step-exec-1',
    node: { configuration: {} },
    workflowExecution: { workflowDefinition: {} },
    scopeStack: WorkflowScopeStack.fromStackFrames([]),
    contextManager: {
      getDependencies: jest.fn(() => ({ config: {} })),
      ensureContextReady: jest.fn().mockResolvedValue(undefined),
      releaseReadPins: jest.fn(),
    },
  } as unknown as StepExecutionRuntime);

const createRunNodeParams = (): WorkflowExecutionLoopParams => {
  const node = { id: 'node1', stepId: 'step1', stepType: 'data.set' } as GraphNodeUnion;
  const workflowExecution = { status: ExecutionStatus.RUNNING } as EsWorkflowExecution;

  return {
    workflowRuntime: { getWorkflowExecution: () => workflowExecution },
    workflowExecutionCursor: createMockWorkflowExecutionCursor({
      currentNode: node,
      currentStackFrames: [],
      isExecuting: true,
    }),
    workflowExecutionState: { getWorkflowExecution: () => workflowExecution },
    stepExecutionRuntimeFactory: { createStepExecutionRuntime },
    nodesFactory: { create: () => ({ run: jest.fn().mockResolvedValue(undefined) }) },
    workflowLogger: createMockWorkflowEventLogger(),
  } as unknown as WorkflowExecutionLoopParams;
};

describe('APM span context', () => {
  beforeEach(() => {
    fakeApm.startedSpans = [];
    jest
      .mocked(runStackMonitor)
      .mockImplementation(
        (_params, _stepExecutionRuntime, monitorAbortController) =>
          new Promise((resolve) =>
            monitorAbortController.signal.addEventListener('abort', () => resolve())
          )
      );
  });

  it('runNode keeps its node span out of the caller context', async () => {
    const parentSpan = fakeApm.startSpan('workflow execution loop');
    const params = createRunNodeParams();

    for (let i = 0; i < STEP_COUNT; i++) {
      await runNode(params);
      expect(fakeApm.currentSpan).toBe(parentSpan);
    }

    const nodeSpans = fakeApm.startedSpans.filter(({ name }) => name.startsWith('node: '));
    expect(nodeSpans).toHaveLength(STEP_COUNT);
    expect(nodeSpans.every((span) => span.parent === parentSpan)).toBe(true);
  });

  it('NodeImplementation.run keeps its step span out of the caller context', async () => {
    const parentSpan = fakeApm.startSpan('node: step1');
    const step: BaseStep = { name: 'step1', stepId: 'step1', type: 'atomic' };
    const workflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    for (let i = 0; i < STEP_COUNT; i++) {
      await new TestStepImpl(step, createStepExecutionRuntime(), undefined, workflowRuntime).run();
      expect(fakeApm.currentSpan).toBe(parentSpan);
    }

    const stepSpans = fakeApm.startedSpans.filter(({ name }) => name.startsWith('step: '));
    expect(stepSpans).toHaveLength(STEP_COUNT);
    expect(stepSpans.every((span) => span.parent === parentSpan)).toBe(true);
  });
});
