/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterForeachNode, ForEachStep } from '@kbn/workflows';
import { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterForeachNodeImpl } from '../enter_foreach_node_impl';

describe('EnterForeachNodeImpl', () => {
  let step: EnterForeachNode;
  let workflowStateMock: WorkflowExecutionRuntimeManager;
  let underTest: EnterForeachNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let getStepState: jest.Mock<any, any, any>;
  let setStepState: jest.Mock<any, any, any>;
  let goToNextStep: jest.Mock<any, any, any>;

  beforeEach(() => {
    startStep = jest.fn();
    getStepState = jest.fn();
    setStepState = jest.fn();
    goToNextStep = jest.fn();
    step = {
      id: 'testStep',
      type: 'enter-foreach',
      itemNodeIds: ['foreachItemNode'],
      configuration: {
        foreach: JSON.stringify(['item1', 'item2', 'item3']),
      } as ForEachStep,
    };
    workflowStateMock = {
      startStep,
      getStepState,
      setStepState,
      goToNextStep,
    } as any;
    underTest = new EnterForeachNodeImpl(step, workflowStateMock);
  });

  describe('on the first enter', () => {
    beforeEach(() => {
      getStepState.mockReturnValue(undefined);
    });

    it('should start step', async () => {
      await underTest.run();

      expect(workflowStateMock.startStep).toHaveBeenCalledTimes(1);
      expect(workflowStateMock.startStep).toHaveBeenCalledWith(step.id);
    });

    it('should initialize foreach state', async () => {
      await underTest.run();

      expect(workflowStateMock.setStepState).toHaveBeenCalledTimes(1);
      expect(workflowStateMock.setStepState).toHaveBeenCalledWith(step.id, {
        items: ['item1', 'item2', 'item3'],
        item: 'item1',
        index: 0,
        total: 3,
      });
    });

    it('should go to next node', async () => {
      await underTest.run();

      expect(workflowStateMock.startStep).toHaveBeenCalledTimes(1);
      expect(workflowStateMock.goToNextStep).toHaveBeenCalled();
    });
  });

  describe('on next iterations', () => {
    beforeEach(() => {
      getStepState.mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        item: 'item1',
        index: 0,
        total: 3,
      });
    });

    it('should not start step', async () => {
      await underTest.run();

      expect(workflowStateMock.startStep).not.toHaveBeenCalledWith(step.id);
    });

    it('should initialize foreach state', async () => {
      await underTest.run();

      expect(workflowStateMock.setStepState).toHaveBeenCalledTimes(1);
      expect(workflowStateMock.setStepState).toHaveBeenCalledWith(step.id, {
        items: ['item1', 'item2', 'item3'],
        item: 'item2',
        index: 1,
        total: 3,
      });
    });

    it('should go to next node', async () => {
      await underTest.run();

      expect(goToNextStep).toHaveBeenCalled();
    });
  });
});
