/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlowContinueNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { FlowContinueNodeImpl } from '../flow_continue_node_impl';

describe('FlowContinueNodeImpl', () => {
  let node: FlowContinueNode;
  let stepExecutionRuntime: StepExecutionRuntime;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let underTest: FlowContinueNodeImpl;

  beforeEach(() => {
    node = {
      id: 'continue_step',
      stepId: 'continue_step',
      stepType: 'flow.continue',
      type: 'flow-continue',
      loopExitNodeId: 'exitForeach_my_loop',
    };

    stepExecutionRuntime = {
      startStep: jest.fn(),
      finishStep: jest.fn(),
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManager = {
      navigateToNextNode: jest.fn(),
      navigateToNode: jest.fn(),
      unwindScopesToLoop: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    workflowLogger = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;

    underTest = new FlowContinueNodeImpl(
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

  it('should unwind scopes and navigate to the loop exit node', () => {
    underTest.run();

    expect(wfExecutionRuntimeManager.unwindScopesToLoop).toHaveBeenCalled();
    expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitForeach_my_loop');
  });
});
