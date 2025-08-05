/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitForeachNode } from '@kbn/workflows';
import { ExitForeachNodeImpl } from '../exit_foreach_node_impl';
import { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';

describe('ExitForeachNodeImpl', () => {
  let step: ExitForeachNode;
  let wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let underTest: ExitForeachNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let getStepState: jest.Mock<any, any, any>;
  let setStepState: jest.Mock<any, any, any>;
  let setStepResult: jest.Mock<any, any, any>;
  let goToNextStep: jest.Mock<any, any, any>;
  let goToStep: jest.Mock<any, any, any>;
  let finishStep: jest.Mock<any, any, any>;

  beforeEach(() => {
    startStep = jest.fn();
    getStepState = jest.fn();
    setStepState = jest.fn();
    setStepResult = jest.fn();
    goToNextStep = jest.fn();
    finishStep = jest.fn();
    goToStep = jest.fn();
    step = {
      id: 'testStep',
      type: 'exit-foreach',
      startNodeId: 'foreachStartNode',
    };
    wfExecutionRuntimeManager = {
      startStep,
      getStepState,
      setStepState,
      setStepResult,
      goToNextStep,
      finishStep,
      goToStep,
    } as any;
    underTest = new ExitForeachNodeImpl(step, wfExecutionRuntimeManager);
  });

  describe('when no foreach step', () => {
    beforeEach(() => {
      getStepState.mockReturnValue(undefined);
    });

    it('should throw an error', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.setStepResult).toHaveBeenCalledWith(step.startNodeId, {
        output: null,
        error: expect.any(Error),
      });
      expect(wfExecutionRuntimeManager.finishStep).toHaveBeenCalledWith(step.startNodeId);
    });
  });

  describe('when there are more items to process', () => {
    beforeEach(() => {
      getStepState.mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        index: 1,
        item: 'item2',
        total: 3,
      });
    });

    it('should go to the start node', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.goToStep).toHaveBeenCalledWith(step.startNodeId);
    });

    it('should not finish the foreach step and not set step result', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.finishStep).not.toHaveBeenCalled();
      expect(wfExecutionRuntimeManager.setStepResult).not.toHaveBeenCalled();
    });
  });

  describe('when no more items to process', () => {
    beforeEach(() => {
      getStepState.mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        index: 2,
        item: 'item3',
        total: 3,
      });
    });

    it('should clear the foreach state', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.setStepState).toHaveBeenCalledWith(
        step.startNodeId,
        undefined
      );
    });

    it('should finish the foreach step', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.finishStep).toHaveBeenCalledWith(step.startNodeId);
    });

    it('should go to the next step', async () => {
      await underTest.run();

      expect(wfExecutionRuntimeManager.goToNextStep).toHaveBeenCalled();
    });
  });
});
