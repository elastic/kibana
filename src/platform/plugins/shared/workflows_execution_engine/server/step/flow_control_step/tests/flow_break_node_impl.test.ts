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

    wfExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManager.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManager.navigateToNode = jest.fn();
    wfExecutionRuntimeManager.requestLoopBreak = jest.fn();

    stepExecutionRuntime = {} as unknown as StepExecutionRuntime;
    stepExecutionRuntime.contextManager = {
      renderValueAccordingToContext: jest.fn().mockImplementation((input) => input),
      getContext: jest.fn().mockReturnValue({}),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();

    underTest = new FlowBreakNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger
    );
  });

  describe('unconditional break', () => {
    it('should request loop break and navigate to exit node', () => {
      underTest.run();

      expect(wfExecutionRuntimeManager.requestLoopBreak).toHaveBeenCalledWith('my_loop');
      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitForeach_my_loop');
    });
  });

  describe('conditional break', () => {
    beforeEach(() => {
      node.condition = 'foreach.item.status : "done"';
      underTest = new FlowBreakNodeImpl(
        node,
        stepExecutionRuntime,
        wfExecutionRuntimeManager,
        workflowLogger
      );
    });

    it('should break when condition evaluates to true', () => {
      (
        stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
      ).mockReturnValue(true);

      underTest.run();

      expect(wfExecutionRuntimeManager.requestLoopBreak).toHaveBeenCalledWith('my_loop');
      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitForeach_my_loop');
    });

    it('should continue loop when condition evaluates to false', () => {
      (
        stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
      ).mockReturnValue(false);

      underTest.run();

      expect(wfExecutionRuntimeManager.requestLoopBreak).not.toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.navigateToNode).not.toHaveBeenCalled();
    });
  });
});
