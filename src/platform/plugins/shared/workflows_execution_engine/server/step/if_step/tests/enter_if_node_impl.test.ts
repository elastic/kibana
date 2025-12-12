/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterConditionBranchNode, EnterIfNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { EnterIfNodeImpl } from '../enter_if_node_impl';

describe('EnterIfNodeImpl', () => {
  let node: EnterIfNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: EnterIfNodeImpl;
  let workflowContextLoggerMock: IWorkflowEventLogger;
  let mockContextManager: jest.Mocked<
    Pick<WorkflowContextManager, 'getContext' | 'renderValueAccordingToContext'>
  >;
  let workflowGraph: WorkflowGraph;

  beforeEach(() => {
    workflowContextLoggerMock = {} as unknown as IWorkflowEventLogger;
    workflowContextLoggerMock.logDebug = jest.fn();

    mockContextManager = {
      getContext: jest.fn().mockReturnValue({
        event: { type: 'alert' },
      }),
      renderValueAccordingToContext: jest.fn().mockImplementation((value) => value),
    };

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn(),
    } as any;

    node = {
      id: 'testStep',
      type: 'enter-if',
      stepId: 'testStep',
      stepType: 'if',
      exitNodeId: 'exitIfNode',
      configuration: {} as any,
    };

    mockWorkflowRuntime = {
      navigateToNode: jest.fn(),
    } as any;

    workflowGraph = {} as unknown as WorkflowGraph;
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'thenNode',
        type: 'enter-then-branch',
        condition: 'event.type: alert',
      } as EnterConditionBranchNode,
      {
        id: 'elseNode',
        type: 'enter-else-branch',
      } as EnterConditionBranchNode,
    ]);
    impl = new EnterIfNodeImpl(
      node,
      mockWorkflowRuntime,
      workflowGraph,
      mockStepExecutionRuntime,
      workflowContextLoggerMock
    );
  });

  it('should start the step with condition rendered value and condition result', async () => {
    mockContextManager.renderValueAccordingToContext = jest
      .fn()
      .mockImplementation(() => 'event.type: foo');

    await impl.run();

    expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
      'event.type: alert'
    );
    expect(mockStepExecutionRuntime.startStep).toHaveBeenCalledWith();
  });

  it('should set step inputs', async () => {
    mockContextManager.renderValueAccordingToContext = jest
      .fn()
      .mockImplementation(() => 'event.type: foo');

    await impl.run();

    expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
      'event.type: alert'
    );
    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
      condition: 'event.type: foo',
      conditionResult: false,
    });
  });

  describe('then branch', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: 'event.type:alert',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);
    });
    it('should evaluate condition and go to thenNode if condition is true', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledTimes(1);
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('thenNode');
    });

    it('should log debug message for then branch', async () => {
      await impl.run();
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        `Condition "event.type:alert" evaluated to true for step testStep. Going to then branch.`
      );
    });
  });

  describe('else branch', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: 'event.type:rule',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);
    });
    it('should evaluate condition and go to elseNode if condition is false', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledTimes(1);
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('elseNode');
    });

    it('should log debug message for else branch', async () => {
      await impl.run();
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        `Condition "event.type:rule" evaluated to false for step testStep. Going to else branch.`
      );
    });
  });

  describe('no else branch defined', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: 'event.type:rule',
        } as EnterConditionBranchNode,
      ]);
    });

    it('should evaluate condition and go to exit node if no else branch is defined', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledTimes(1);
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('exitIfNode');
    });

    it('should log debug message for no else branch defined', async () => {
      await impl.run();
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        `Condition "event.type:rule" evaluated to false for step testStep. No else branch defined. Exiting if condition.`
      );
    });
  });

  it('should throw an error if successors are not enter-condition-branch', async () => {
    workflowGraph.getDirectSuccessors = jest
      .fn()
      .mockReturnValueOnce([{ id: 'someOtherNode', type: 'some-other-type' }]);
    await expect(impl.run()).rejects.toThrow(
      `EnterIfNode with id ${node.id} must have only 'enter-then-branch' or 'enter-else-branch' successors, but found: some-other-type`
    );
  });

  it('should throw an error if condition evaluation fails', async () => {
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
      {
        id: 'thenNode',
        type: 'enter-then-branch',
        condition: 'invalid""condition',
      } as EnterConditionBranchNode,
    ]);
    await expect(impl.run()).rejects.toThrow(
      `Syntax error in condition "invalid""condition" for step ${node.stepId}:`
    );
  });

  describe('boolean evaluation with ${{ }} syntax', () => {
    it('should use boolean value directly when ${{ }} evaluates to boolean true', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.isActive }}',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(true);

      await impl.run();

      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('thenNode');
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('evaluated to true')
      );
    });

    it('should use boolean value directly when ${{ }} evaluates to boolean false', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.isActive }}',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(false);

      await impl.run();

      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('elseNode');
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('evaluated to false')
      );
    });

    it('should handle undefined condition and default to false', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.undefinedValue }}',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(undefined);

      await impl.run();

      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('elseNode');
    });
  });

  describe('string evaluation with {{ }} syntax (backward compatibility)', () => {
    it('should evaluate string condition as KQL expression', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '{{ inputs.status }}:active',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-else-branch',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue('event.type:alert');

      await impl.run();

      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('thenNode');
    });
  });

  describe('error handling for invalid condition types', () => {
    it('should throw informative error for object condition', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.config }}',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue({
        enabled: true,
        timeout: 5000,
      });

      await expect(impl.run()).rejects.toThrow(
        /Invalid condition type.*expected boolean or string/
      );
    });

    it('should throw informative error for array condition', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.items }}',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest
        .fn()
        .mockReturnValue(['item1', 'item2']);

      await expect(impl.run()).rejects.toThrow(
        /Invalid condition type.*expected boolean or string/
      );
    });

    it('should throw informative error for number condition', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.count }}',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(42);

      await expect(impl.run()).rejects.toThrow(
        /Invalid condition type.*expected boolean or string/
      );
    });

    it('should include step ID in error message', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-then-branch',
          condition: '${{ inputs.data }}',
        } as EnterConditionBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue({});

      await expect(impl.run()).rejects.toThrow(
        new RegExp(`Invalid condition type for step ${node.stepId}`)
      );
    });
  });
});
