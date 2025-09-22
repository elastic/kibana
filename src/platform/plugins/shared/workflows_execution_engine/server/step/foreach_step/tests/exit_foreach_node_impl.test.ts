/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitForeachNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitForeachNodeImpl } from '../exit_foreach_node_impl';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';

describe('ExitForeachNodeImpl', () => {
  let node: ExitForeachNode;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;
  let underTest: ExitForeachNodeImpl;

  beforeEach(() => {
    node = {
      id: 'testStep',
      stepId: 'testStep',
      stepType: 'foreach',
      type: 'exit-foreach',
      startNodeId: 'foreachStartNode',
    };
    wfExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManager.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManager.navigateToNode = jest.fn();
    wfExecutionRuntimeManager.finishStep = jest.fn();
    wfExecutionRuntimeManager.getCurrentStepState = jest.fn();
    wfExecutionRuntimeManager.setCurrentStepState = jest.fn();
    wfExecutionRuntimeManager.exitScope = jest.fn();
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    underTest = new ExitForeachNodeImpl(node, wfExecutionRuntimeManager, workflowLogger);
  });

  describe('when no foreach step', () => {
    beforeEach(() => {
      wfExecutionRuntimeManager.getCurrentStepState = jest.fn().mockReturnValue(undefined);
    });

    it('should throw an error', async () => {
      await expect(underTest.run()).rejects.toThrow(
        new Error(`Foreach state for step ${node.stepId} not found`)
      );
    });
  });

  describe('when there are more items to process', () => {
    beforeEach(() => {
      wfExecutionRuntimeManager.getCurrentStepState = jest.fn().mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        index: 1,
        item: 'item2',
        total: 3,
      });
    });

    it('should go to the start node', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith(node.startNodeId);
    });

    it('should not finish the foreach step and not set step state', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.finishStep).not.toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.setCurrentStepState).not.toHaveBeenCalled();
    });

    it('should exit iteration scope', async () => {
      await underTest.run();
      expect(wfExecutionRuntimeManager.exitScope).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no more items to process', () => {
    beforeEach(() => {
      wfExecutionRuntimeManager.getCurrentStepState = jest.fn().mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        index: 2,
        item: 'item3',
        total: 3,
      });
    });

    it('should finish the foreach step', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.finishStep).toHaveBeenCalledWith();
    });

    it('should go to the next step', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });

    it('should log debug message', async () => {
      await underTest.run();

      expect(workflowLogger.logDebug).toHaveBeenCalledWith(
        `Exiting foreach step ${node.stepId} after processing all items.`,
        { workflow: { step_id: node.stepId } }
      );
    });

    it('should exit iteration scope', async () => {
      await underTest.run();
      expect(wfExecutionRuntimeManager.exitScope).toHaveBeenCalledTimes(1);
    });
  });
});
