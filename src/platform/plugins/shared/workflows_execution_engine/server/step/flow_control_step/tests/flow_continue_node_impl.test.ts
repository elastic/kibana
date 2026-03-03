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
      loopEnterNodeId: 'enterForeach_my_loop',
    };

    wfExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManager.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManager.navigateToNode = jest.fn();

    stepExecutionRuntime = {} as unknown as StepExecutionRuntime;
    stepExecutionRuntime.contextManager = {
      renderValueAccordingToContext: jest.fn().mockImplementation((input) => input),
      getContext: jest.fn().mockReturnValue({}),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();

    underTest = new FlowContinueNodeImpl(
      node,
      stepExecutionRuntime,
      wfExecutionRuntimeManager,
      workflowLogger
    );
  });

  describe('unconditional continue', () => {
    it('should navigate to the loop enter node', () => {
      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('enterForeach_my_loop');
    });
  });

  describe('conditional continue', () => {
    beforeEach(() => {
      node.condition = 'foreach.item.processed : true';
      underTest = new FlowContinueNodeImpl(
        node,
        stepExecutionRuntime,
        wfExecutionRuntimeManager,
        workflowLogger
      );
    });

    it('should continue when condition evaluates to true', () => {
      (
        stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
      ).mockReturnValue(true);

      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('enterForeach_my_loop');
    });

    it('should continue iteration when condition evaluates to false', () => {
      (
        stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
      ).mockReturnValue(false);

      underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.navigateToNode).not.toHaveBeenCalled();
    });
  });
});
