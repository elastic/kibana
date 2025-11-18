/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterContinueNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';
import { EnterContinueNodeImpl } from '../enter_continue_node_impl';

describe('EnterContinueNodeImpl', () => {
  let underTest: EnterContinueNodeImpl;
  let node: EnterContinueNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    node = {
      id: 'continueStep1',
      type: 'enter-continue',
      stepId: 'continueStep1',
      stepType: 'continue',
      exitNodeId: 'exitContinue(continueStep1)',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new EnterContinueNodeImpl(node, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.navigateToNextNode = jest.fn();
    });

    it('should go to next node', async () => {
      await underTest.run();
      expect(workflowRuntime.navigateToNextNode).toHaveBeenCalled();
    });
  });

  describe('catchError', () => {
    beforeEach(() => {
      workflowRuntime.navigateToNode = jest.fn();
      workflowRuntime.setWorkflowError = jest.fn();
    });

    it('should log debug message about error caught', async () => {
      await underTest.catchError();
      expect(workflowLogger.logDebug).toHaveBeenCalledWith(`Error caught, continuing execution.`);
    });

    it('should go to exit continue node', async () => {
      await underTest.catchError();
      expect(workflowRuntime.navigateToNode).toHaveBeenCalledWith(node.exitNodeId);
    });

    it('should clear workflow error', async () => {
      await underTest.catchError();
      expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
    });
  });
});
