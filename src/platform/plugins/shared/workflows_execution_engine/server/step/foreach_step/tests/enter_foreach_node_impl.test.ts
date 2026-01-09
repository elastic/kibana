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
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { EnterForeachNodeImpl } from '../enter_foreach_node_impl';

describe('EnterForeachNodeImpl', () => {
  let node: EnterForeachNode;
  let workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntime: StepExecutionRuntime;
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
    workflowExecutionRuntimeManager.navigateToNextNode = jest.fn();
    workflowExecutionRuntimeManager.navigateToNode = jest.fn();
    workflowExecutionRuntimeManager.enterScope = jest.fn();

    stepExecutionRuntime = {} as unknown as StepExecutionRuntime;
    stepExecutionRuntime.startStep = jest.fn();
    stepExecutionRuntime.finishStep = jest.fn();
    stepExecutionRuntime.getCurrentStepState = jest.fn();
    stepExecutionRuntime.setCurrentStepState = jest.fn();
    stepExecutionRuntime.setInput = jest.fn();
    stepExecutionRuntime.contextManager = {
      renderValueAccordingToContext: jest.fn().mockImplementation((input) => input),
      evaluateExpressionInContext: jest.fn().mockImplementation((input) => input),
    } as any;

    workflowLogger = {} as unknown as IWorkflowEventLogger;
    workflowLogger.logDebug = jest.fn();
    underTest = new EnterForeachNodeImpl(
      node,
      workflowExecutionRuntimeManager,
      stepExecutionRuntime,
      workflowLogger
    );
  });

  describe('on the first enter', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue(undefined);
    });

    it('should enter the iteration scope', async () => {
      await underTest.run();

      expect(workflowExecutionRuntimeManager.enterScope).toHaveBeenCalledWith('0');
    });

    describe('when foreach configuration is an array with items', () => {
      beforeEach(() => {
        node.configuration.foreach = JSON.stringify(['item1', 'item2', 'item3']);
        stepExecutionRuntime.contextManager.evaluateExpressionInContext = jest
          .fn()
          .mockImplementation((input) => input);
      });

      it('should start step with foreach input equal to provided rendered JSON', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.startStep).toHaveBeenCalledWith();
      });

      it('should set step input equal to provided rendered JSON', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setInput).toHaveBeenCalledWith({
          foreach: JSON.stringify(['item1', 'item2', 'item3']),
        });
      });

      it('should initialize foreach state if configuration contains JSON', async () => {
        await underTest.run();

        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });
    });

    describe('when foreach configuration is an expression', () => {
      beforeEach(() => {
        node.configuration.foreach = '{{steps.testStep.array}}';
        stepExecutionRuntime.contextManager.evaluateExpressionInContext = jest
          .fn()
          .mockReturnValue(['item1', 'item2', 'item3']);
      });

      it('should start step with foreach input equal to rendered value', async () => {
        await underTest.run();

        expect(stepExecutionRuntime.startStep).toHaveBeenCalledWith();
      });

      it('should set step inputs', async () => {
        await underTest.run();

        expect(stepExecutionRuntime.setInput).toHaveBeenCalledWith({
          foreach: '{{steps.testStep.array}}',
        });
      });

      it('should evaluate foreach expression', async () => {
        await underTest.run();

        expect(
          stepExecutionRuntime.contextManager.evaluateExpressionInContext
        ).toHaveBeenCalledWith('{{steps.testStep.array}}');
      });

      it('should parse value returned by expression if it is a string', async () => {
        (
          stepExecutionRuntime.contextManager.evaluateExpressionInContext as jest.Mock
        ).mockReturnValue('["item1", "item2", "item3"]');
        await underTest.run();

        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should throw an error if expression evaluated to null', async () => {
        (
          stepExecutionRuntime.contextManager.evaluateExpressionInContext as jest.Mock
        ).mockReturnValue(null);
        await expect(underTest.run()).rejects.toThrowError(
          'Foreach expression must evaluate to an array. Expression "{{steps.testStep.array}}" resolved to object (null).'
        );
      });

      it('should throw an error if the expression evaluated to an object', async () => {
        (
          stepExecutionRuntime.contextManager.evaluateExpressionInContext as jest.Mock
        ).mockReturnValue({
          key: 'value',
        });
        await expect(underTest.run()).rejects.toThrowError(
          'Foreach expression must evaluate to an array. Expression "{{steps.testStep.array}}" resolved to object: {"key":"value"}.'
        );
      });

      it('should throw an error if expression evaluates to string that could not be parsed', async () => {
        (
          stepExecutionRuntime.contextManager.evaluateExpressionInContext as jest.Mock
        ).mockReturnValue('{"key": value }');
        await expect(underTest.run()).rejects.toThrowError(
          'Unable to parse rendered value: {"key": value }'
        );
      });
    });

    describe('when foreach configuration is renderable string', () => {
      beforeEach(() => {
        node.configuration.foreach = '[{ "object": {{steps.testStep.array}}}]';
        stepExecutionRuntime.contextManager.renderValueAccordingToContext = jest
          .fn()
          .mockReturnValue(JSON.stringify(['item1', 'item2', 'item3']));
      });

      it('should render foreach expression', async () => {
        await underTest.run();

        expect(
          stepExecutionRuntime.contextManager.renderValueAccordingToContext
        ).toHaveBeenCalledWith('[{ "object": {{steps.testStep.array}}}]');
      });

      it('should parse value returned by rendering process', async () => {
        await underTest.run();

        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledTimes(1);
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          items: ['item1', 'item2', 'item3'],
          item: 'item1',
          index: 0,
          total: 3,
        });
      });

      it('should throw an error if rendering reurned not an array', async () => {
        (
          stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
        ).mockReturnValue(JSON.stringify({ foo: 'bar' }));
        await expect(underTest.run()).rejects.toThrowError(
          'Foreach expression must evaluate to an array.'
        );
      });

      it('should throw an error if expression evaluates to string that could not be parsed', async () => {
        (
          stepExecutionRuntime.contextManager.renderValueAccordingToContext as jest.Mock
        ).mockReturnValue('{"key": value }');
        await expect(underTest.run()).rejects.toThrowError(
          'Unable to parse rendered value: {"key": value }'
        );
      });
    });

    describe('when foreach configuration is an empty array', () => {
      beforeEach(() => {
        node.configuration.foreach = JSON.stringify([]);
      });

      it('should set empty items and total to 0', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
          items: [],
          total: 0,
        });
      });

      it('should finish step', async () => {
        await underTest.run();
        expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith();
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

      expect(stepExecutionRuntime.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
    });

    it('should throw an error if foreach configuration is not provided', async () => {
      node.configuration.foreach = undefined as any;

      await expect(underTest.run()).rejects.toThrowError(
        'Foreach configuration is required. Please specify an array or expression that evaluates to an array.'
      );
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
    });

    it('should throw an error if foreach configuration is not an array', async () => {
      node.configuration.foreach = JSON.stringify({ key: 'value' });

      await expect(underTest.run()).rejects.toThrowError(
        'Foreach expression must evaluate to an array. Expression "{"key":"value"}" resolved to object: {"key":"value"}.'
      );
      expect(stepExecutionRuntime.startStep).toHaveBeenCalledTimes(1);
      expect(workflowExecutionRuntimeManager.navigateToNextNode).not.toHaveBeenCalled();
    });
  });

  describe('on next iterations', () => {
    beforeEach(() => {
      (stepExecutionRuntime.getCurrentStepState as jest.Mock).mockReturnValue({
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

      expect(stepExecutionRuntime.startStep).not.toHaveBeenCalledWith();
    });

    it('should initialize foreach state', async () => {
      await underTest.run();

      expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledTimes(1);
      expect(stepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
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
