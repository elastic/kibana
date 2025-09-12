/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterForeachNode, ForEachStep } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterForeachNodeImpl } from '../enter_foreach_node_impl';

describe('EnterForeachNodeImpl', () => {
  let step: EnterForeachNode;
  let workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let underTest: EnterForeachNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let finishStep: jest.Mock<any, any, any>;
  let getStepState: jest.Mock<any, any, any>;
  let setStepState: jest.Mock<any, any, any>;
  let goToNextStep: jest.Mock<any, any, any>;
  let goToStep: jest.Mock<any, any, any>;
  let enterScope: jest.Mock<any, any, any>;
  let readContextPath: jest.Mock<any, any, any>;
  let logDebug: jest.Mock<any, any, any>;

  beforeEach(() => {
    startStep = jest.fn();
    finishStep = jest.fn();
    getStepState = jest.fn();
    setStepState = jest.fn();
    goToNextStep = jest.fn();
    goToStep = jest.fn();
    enterScope = jest.fn();
    readContextPath = jest.fn();
    logDebug = jest.fn();
    step = {
      id: 'testStep',
      type: 'enter-foreach',
      exitNodeId: 'exitNode',
      configuration: {
        foreach: JSON.stringify(['item1', 'item2', 'item3']),
      } as ForEachStep,
    };
    workflowExecutionRuntimeManager = {
      startStep,
      finishStep,
      getStepState,
      setStepState,
      goToNextStep,
      goToStep,
      enterScope,
    } as any;
    const contextManager = { readContextPath } as any;
    const workflowLogger = {
      logDebug,
    } as any;
    underTest = new EnterForeachNodeImpl(
      step,
      workflowExecutionRuntimeManager,
      contextManager,
      workflowLogger
    );
  });

  describe('on the first enter', () => {
    beforeEach(() => {
      getStepState.mockReturnValue(undefined);
    });

    it('should enter the whole foreach scope', async () => {
      await underTest.run();

      expect(enterScope).toHaveBeenCalledWith();
    });

    it('should enter the iteration scope', async () => {
      await underTest.run();

      expect(enterScope).toHaveBeenCalledWith('0');
    });

    it('should enter scopes in correct order', async () => {
      await underTest.run();
      expect(enterScope).toHaveBeenNthCalledWith(1);
      expect(enterScope).toHaveBeenNthCalledWith(2, '0');
    });

    it('should enter scope twice', async () => {
      await underTest.run();

      expect(enterScope).toHaveBeenCalledTimes(2);
    });

    it('should start step', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledWith(step.id);
    });

    describe('when foreach configuration is an array with items', () => {
      it('should initialize foreach state if configuration contains JSON', async () => {
        step.configuration.foreach = JSON.stringify(['item1', 'item2', 'item3']);
        await underTest.run();

        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith(step.id, {
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should initialize foreach state from the context', async () => {
        step.configuration.foreach = 'steps.testStep.array';
        readContextPath.mockReturnValue({
          value: ['item1', 'item2', 'item3'],
          pathExists: true,
        });
        await underTest.run();

        expect(readContextPath).toHaveBeenCalledWith('steps.testStep.array');
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith(step.id, {
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should initialize foreach state from the context when context contains JSON array', async () => {
        step.configuration.foreach = 'steps.testStep.array';
        readContextPath.mockReturnValue({
          value: JSON.stringify(['item1', 'item2', 'item3']),
          pathExists: true,
        });
        await underTest.run();

        expect(readContextPath).toHaveBeenCalledWith('steps.testStep.array');
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith(step.id, {
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should log debug message about items count', async () => {
        await underTest.run();

        expect(logDebug).toHaveBeenCalledWith(
          `Foreach step "testStep" will iterate over 3 items.`,
          { workflow: { step_id: 'testStep' } }
        );
      });
    });

    describe('when foreach configuration is an empty array', () => {
      beforeEach(() => {
        step.configuration.foreach = JSON.stringify([]);
      });

      it('should set empty items and total to 0', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith(step.id, {
          items: [],
          total: 0,
        });
      });

      it('should finish step', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.finishStep).toHaveBeenCalledWith(step.id);
      });

      it('should go to exit node', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitNode');
      });

      it('should log debug message', async () => {
        await underTest.run();
        expect(logDebug).toHaveBeenCalledWith(
          `Foreach step "testStep" has no items to iterate over. Skipping execution.`,
          { workflow: { step_id: 'testStep' } }
        );
      });
    });

    it('should go to next node', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });

    it('should throw an error if foreach configuration is not provided', async () => {
      step.configuration.foreach = undefined as any;

      await expect(underTest.run()).rejects.toThrowError('Foreach configuration is required');
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('should throw an error if foreach configuration is not an array', async () => {
      step.configuration.foreach = JSON.stringify({ key: 'value' });

      await expect(underTest.run()).rejects.toThrowError('Foreach configuration must be an array');
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
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

    it('should enter iteration scope', async () => {
      await underTest.run();

      expect(enterScope).toHaveBeenCalledWith('1');
    });

    it('should enter scope only once', async () => {
      await underTest.run();

      expect(enterScope).toHaveBeenCalledTimes(1);
    });

    it('should not start step', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.startStep).not.toHaveBeenCalledWith(step.id);
    });

    it('should initialize foreach state', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith(step.id, {
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
