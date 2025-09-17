/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ForEachStep } from '@kbn/workflows';
import type { EnterForeachNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterForeachNodeImpl } from '../enter_foreach_node_impl';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';

describe('EnterForeachNodeImpl', () => {
  let node: EnterForeachNode;
  let workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let contextManager: WorkflowContextManager;
  let workflowLogger: IWorkflowEventLogger;
  let underTest: EnterForeachNodeImpl;

  beforeEach(() => {
    node = {
      id: 'testStep',
      type: 'enter-foreach',
      stepId: 'testStep',
      stepType: 'foreach',
      exitNodeId: 'exitNode',
      configuration: {
        foreach: JSON.stringify(['item1', 'item2', 'item3']),
      } as ForEachStep,
    };
    workflowExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowExecutionRuntimeManager.startStep = jest.fn();
    workflowExecutionRuntimeManager.finishStep = jest.fn();
    workflowExecutionRuntimeManager.getCurrentStepState = jest.fn();
    workflowExecutionRuntimeManager.setCurrentStepState = jest.fn();
    workflowExecutionRuntimeManager.navigateToNextNode = jest.fn();
    workflowExecutionRuntimeManager.navigateToNode = jest.fn();
    workflowExecutionRuntimeManager.enterScope = jest.fn();
    contextManager = {} as unknown as WorkflowContextManager;
    contextManager.readContextPath = jest.fn();
    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    underTest = new EnterForeachNodeImpl(
      node,
      workflowExecutionRuntimeManager,
      contextManager,
      workflowLogger
    );
  });

  describe('on the first enter', () => {
    beforeEach(() => {
      (workflowExecutionRuntimeManager.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
    });

    it('should enter the iteration scope', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.enterScope).toHaveBeenCalledWith('0');
    });

    it('should start step', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledWith();
    });

    describe('when foreach configuration is an array with items', () => {
      it('should initialize foreach state if configuration contains JSON', async () => {
        node.configuration.foreach = JSON.stringify(['item1', 'item2', 'item3']);
        await underTest.run();

        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should initialize foreach state from the context', async () => {
        node.configuration.foreach = 'steps.testStep.array';
        (contextManager.readContextPath as jest.Mock).mockReturnValue({
          value: ['item1', 'item2', 'item3'],
          pathExists: true,
        });
        await underTest.run();

        expect(contextManager.readContextPath).toHaveBeenCalledWith('steps.testStep.array');
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should initialize foreach state from the context when context contains JSON array', async () => {
        node.configuration.foreach = 'steps.testStep.array';
        (contextManager.readContextPath as jest.Mock).mockReturnValue({
          value: JSON.stringify(['item1', 'item2', 'item3']),
          pathExists: true,
        });
        await underTest.run();

        expect(contextManager.readContextPath).toHaveBeenCalledWith('steps.testStep.array');
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should log debug message about items count', async () => {
        await underTest.run();

        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
          `Foreach step "testStep" will iterate over 3 items.`,
          { workflow: { step_id: 'testStep' } }
        );
      });
    });

    describe('when foreach configuration is an empty array', () => {
      beforeEach(() => {
        node.configuration.foreach = JSON.stringify([]);
      });

      it('should set empty items and total to 0', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith({
          items: [],
          total: 0,
        });
      });

      it('should finish step', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.finishStep).toHaveBeenCalledWith();
      });

      it('should go to exit node', async () => {
        await underTest.run();
        expect(workflowExecutionRuntimeManager.navigateToNode).toHaveBeenCalledWith('exitNode');
      });

      it('should log debug message', async () => {
        await underTest.run();
        expect(workflowLogger.logDebug).toHaveBeenCalledWith(
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
      node.configuration.foreach = undefined as any;

      await expect(underTest.run()).rejects.toThrowError('Foreach configuration is required');
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('should throw an error if foreach configuration is not an array', async () => {
      node.configuration.foreach = JSON.stringify({ key: 'value' });

      await expect(underTest.run()).rejects.toThrowError('Foreach configuration must be an array');
      expect(workflowExecutionRuntimeManager.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
    });
  });

  describe('on next iterations', () => {
    beforeEach(() => {
      (workflowExecutionRuntimeManager.getCurrentStepState as jest.Mock).mockReturnValue({
        items: ['item1', 'item2', 'item3'],
        item: 'item1',
        index: 0,
        total: 3,
      });
    });

    it('should enter iteration scope', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.enterScope).toHaveBeenCalledWith('1');
    });

    it('should enter scope only once', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.enterScope).toHaveBeenCalledTimes(1);
    });

    it('should not start step', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.startStep).not.toHaveBeenCalledWith();
    });

    it('should initialize foreach state', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.setCurrentStepState).toHaveBeenCalledWith({
        items: ['item1', 'item2', 'item3'],
        item: 'item2',
        index: 1,
        total: 3,
      });
    });

    it('should go to next node', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });
  });
});
