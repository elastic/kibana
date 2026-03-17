/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoopBreakNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { LoopBreakNodeImpl } from '../loop_break_node_impl';

describe('LoopBreakNodeImpl', () => {
  let node: LoopBreakNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let stepExecutionRuntimeFactory: StepExecutionRuntimeFactory;
  let underTest: LoopBreakNodeImpl;

  beforeEach(() => {
    node = {
      id: 'break_step',
      stepId: 'break_step',
      stepType: 'loop.break',
      type: 'loop-break',
      loopExitNodeId: 'exitForeach_my_loop',
      loopStepId: 'my_loop',
    };

    stepExecutionRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManager = {
      navigateToNextNode: jest.fn(),
      navigateToNode: jest.fn(),
      navigateToAfterNode: jest.fn(),
      unwindScopes: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    stepExecutionRuntimeFactory = {} as StepExecutionRuntimeFactory;

    underTest = new LoopBreakNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger,
      stepExecutionRuntimeFactory
    );
  });

  it('should start and finish the step with navigateToNode output', () => {
    underTest.run();

    expect(stepExecutionRuntime.startStep).toHaveBeenCalled();
    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      navigateToNode: 'exitForeach_my_loop',
    });
  });

  it('should unwind scopes inclusively and navigate past the exit node', () => {
    underTest.run();

    expect(wfExecutionRuntimeManager.unwindScopes).toHaveBeenCalledWith(
      stepExecutionRuntimeFactory,
      expect.any(Function),
      { inclusive: true }
    );
    expect(wfExecutionRuntimeManager.navigateToAfterNode).toHaveBeenCalledWith(
      'exitForeach_my_loop'
    );
  });
});
