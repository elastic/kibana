/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { WorkflowScopeStack } from '../../../workflow_context_manager/workflow_scope_stack';
import { EnterForeachIterationNodeImpl } from '../enter_foreach_iteration_node_impl';
import { ITERATION_STEP_TYPE, iterationStepIdFromIndex } from '../utils';

describe('EnterForeachIterationNodeImpl', () => {
  let node: GraphNodeUnion;
  let workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntime: StepExecutionRuntime;
  let foreachStepRuntime: StepExecutionRuntime;
  let stepExecutionRuntimeFactory: StepExecutionRuntimeFactory;
  let underTest: EnterForeachIterationNodeImpl;

  beforeEach(() => {
    node = {
      id: 'enterSynthetic_iteration-1_hash',
      type: 'enter-foreach-iteration',
      stepId: iterationStepIdFromIndex(1),
      stepType: ITERATION_STEP_TYPE,
    } as GraphNodeUnion;

    workflowExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowExecutionRuntimeManager.navigateToNextNode = jest.fn();

    stepExecutionRuntime = {
      startStep: jest.fn(),
      setInput: jest.fn(),
      scopeStack: WorkflowScopeStack.fromStackFrames([
        {
          stepId: 'loop',
          nestedScopes: [{ nodeId: 'enterForeach_loop', nodeType: 'enter-foreach' }],
        },
      ]),
    } as unknown as StepExecutionRuntime;

    foreachStepRuntime = {
      node: { stepId: 'loop' },
      getCurrentStepResult: jest.fn().mockReturnValue({
        input: {
          foreach: '{{ consts.items }}',
          items: ['item0', 'item1', 'item2'],
        },
      }),
    } as unknown as StepExecutionRuntime;

    stepExecutionRuntimeFactory = {
      createStepExecutionRuntime: jest.fn().mockReturnValue(foreachStepRuntime),
    } as unknown as StepExecutionRuntimeFactory;

    underTest = new EnterForeachIterationNodeImpl(
      node,
      workflowExecutionRuntimeManager,
      stepExecutionRuntime,
      stepExecutionRuntimeFactory
    );
  });

  it('should start the iteration step', () => {
    underTest.run();

    expect(stepExecutionRuntime.startStep).toHaveBeenCalledWith();
  });

  it('should create a runtime for the enclosing foreach step', () => {
    underTest.run();

    expect(stepExecutionRuntimeFactory.createStepExecutionRuntime).toHaveBeenCalledWith({
      nodeId: 'enterForeach_loop',
      stackFrames: [],
    });
  });

  it('should set the current foreach item as the iteration step input', () => {
    underTest.run();

    expect(foreachStepRuntime.getCurrentStepResult).toHaveBeenCalled();
    expect(stepExecutionRuntime.setInput).toHaveBeenCalledWith({ item: 'item1' });
  });

  it('should go to the next node', () => {
    underTest.run();

    expect(workflowExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
  });

  it('should throw if the foreach step has no items', () => {
    (foreachStepRuntime.getCurrentStepResult as jest.Mock).mockReturnValue({
      input: { foreach: '{{ consts.items }}' },
    });

    expect(() => underTest.run()).toThrow('Foreach step "loop" has no items in its input.');
    expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
  });

  it('should throw if the iteration index is out of range', () => {
    node.stepId = iterationStepIdFromIndex(5);

    expect(() => underTest.run()).toThrow('Foreach iteration index 5 is out of range for 3 items.');
    expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
  });
});
