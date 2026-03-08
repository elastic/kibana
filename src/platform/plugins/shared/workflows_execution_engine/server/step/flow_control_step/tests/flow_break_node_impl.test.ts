/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlowBreakNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { FlowBreakNodeImpl } from '../flow_break_node_impl';

describe('FlowBreakNodeImpl', () => {
  let node: FlowBreakNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let underTest: FlowBreakNodeImpl;

  beforeEach(() => {
    node = {
      id: 'break_step',
      stepId: 'break_step',
      stepType: 'flow.break',
      type: 'flow-break',
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
      unwindScopesToLoop: jest.fn(),
      requestLoopBreak: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    underTest = new FlowBreakNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger
    );
  });

  it('should start and finish the step with navigateToNode output', () => {
    underTest.run();

    expect(stepExecutionRuntime.startStep).toHaveBeenCalled();
    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      navigateToNode: 'exitForeach_my_loop',
    });
  });

  it('should unwind scopes, request loop break, and navigate to exit node', () => {
    underTest.run();

    expect(wfExecutionRuntimeManager.unwindScopesToLoop).toHaveBeenCalled();
    expect(wfExecutionRuntimeManager.requestLoopBreak).toHaveBeenCalledWith('my_loop');
    expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitForeach_my_loop');
  });
});
