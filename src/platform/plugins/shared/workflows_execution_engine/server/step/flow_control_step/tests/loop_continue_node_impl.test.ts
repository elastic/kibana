/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoopContinueNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../../../workflow_context_manager/workflow_execution_state';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { LoopContinueNodeImpl } from '../loop_continue_node_impl';

describe('LoopContinueNodeImpl', () => {
  let node: LoopContinueNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let stepExecutionRuntimeFactory: StepExecutionRuntimeFactory;
  let workflowExecutionState: WorkflowExecutionState;
  let workflowGraph: WorkflowGraph;
  let underTest: LoopContinueNodeImpl;

  beforeEach(() => {
    node = {
      id: 'continue_step',
      stepId: 'continue_step',
      stepType: 'loop.continue',
      type: 'loop-continue',
      loopExitNodeId: 'exitForeach_my_loop',
    };

    stepExecutionRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManager = {
      navigateToNextNode: jest.fn(),
      navigateToNode: jest.fn(),
      unwindScopes: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    stepExecutionRuntimeFactory = {} as StepExecutionRuntimeFactory;

    workflowExecutionState = {
      evictStaleLoopOutputs: jest.fn(),
    } as unknown as WorkflowExecutionState;

    workflowGraph = {
      getNode: jest.fn().mockReturnValue({ stepId: 'my_loop' }),
      getInnerStepIds: jest.fn().mockReturnValue(new Set(['innerAction'])),
    } as unknown as WorkflowGraph;

    underTest = new LoopContinueNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger,
      stepExecutionRuntimeFactory,
      workflowExecutionState,
      workflowGraph
    );
  });

  it('should start and finish the step with navigateToNode output', () => {
    underTest.run();

    expect(stepExecutionRuntime.startStep).toHaveBeenCalled();
    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      navigateToNode: 'exitForeach_my_loop',
    });
  });

  it('should unwind scopes and navigate to the loop exit node', () => {
    underTest.run();

    expect(wfExecutionRuntimeManager.unwindScopes).toHaveBeenCalledWith(
      stepExecutionRuntimeFactory,
      expect.any(Function)
    );
    expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitForeach_my_loop');
  });

  it('should evict stale loop outputs before navigating to the exit node', () => {
    underTest.run();

    expect(workflowGraph.getNode).toHaveBeenCalledWith('exitForeach_my_loop');
    expect(workflowGraph.getInnerStepIds).toHaveBeenCalledWith('my_loop');
    expect(workflowExecutionState.evictStaleLoopOutputs).toHaveBeenCalledWith(
      new Set(['innerAction'])
    );
  });
});
