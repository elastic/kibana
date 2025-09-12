/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterContinueNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterContinueNodeImpl } from '../enter_continue_node_impl';
import type { IWorkflowEventLogger } from '../../../../workflow_event_logger/workflow_event_logger';

describe('EnterContinueNodeImpl', () => {
  let underTest: EnterContinueNodeImpl;
  let step: EnterContinueNode;
  let workflowRuntime: WorkflowExecutionRuntimeManager;
  let workflowLogger: IWorkflowEventLogger;

  beforeEach(() => {
    step = {
      id: 'continueStep1',
      type: 'enter-continue',
      exitNodeId: 'exitContinue(continueStep1)',
    };
    workflowRuntime = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    workflowLogger.logError = jest.fn();
    underTest = new EnterContinueNodeImpl(step, workflowRuntime, workflowLogger);
  });

  describe('run', () => {
    beforeEach(() => {
      workflowRuntime.enterScope = jest.fn();
      workflowRuntime.goToNextStep = jest.fn();
    });

    it('should enter scope', async () => {
      await underTest.run();
      expect(workflowRuntime.enterScope).toHaveBeenCalled();
    });

    it('should go to next step', async () => {
      await underTest.run();
      expect(workflowRuntime.goToNextStep).toHaveBeenCalled();
    });
  });

  describe('catchError', () => {
    beforeEach(() => {
      workflowRuntime.goToStep = jest.fn();
      workflowRuntime.setWorkflowError = jest.fn();
    });

    it('should log debug message about error caught', async () => {
      await underTest.catchError();
      expect(workflowLogger.logDebug).toHaveBeenCalledWith(`Error caught, continuing execution.`);
    });

    it('should go to exit continue node', async () => {
      await underTest.catchError();
      expect(workflowRuntime.goToStep).toHaveBeenCalledWith(step.exitNodeId);
    });

    it('should clear workflow error', async () => {
      await underTest.catchError();
      expect(workflowRuntime.setWorkflowError).toHaveBeenCalledWith(undefined);
    });
  });
});
