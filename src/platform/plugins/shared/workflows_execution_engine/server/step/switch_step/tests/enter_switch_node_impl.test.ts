/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EnterCaseBranchNode,
  EnterDefaultBranchNode,
  EnterSwitchNode,
  WorkflowGraph,
} from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger';
import { EnterSwitchNodeImpl } from '../enter_switch_node_impl';

describe('EnterSwitchNodeImpl', () => {
  let node: EnterSwitchNode;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: EnterSwitchNodeImpl;
  let workflowContextLoggerMock: IWorkflowEventLogger;
  let mockContextManager: jest.Mocked<
    Pick<WorkflowContextManager, 'getContext' | 'renderValueAccordingToContext'>
  >;
  let workflowGraph: WorkflowGraph;

  beforeEach(() => {
    workflowContextLoggerMock = {} as unknown as IWorkflowEventLogger;
    workflowContextLoggerMock.logDebug = jest.fn();

    mockContextManager = {
      getContext: jest.fn().mockReturnValue({}),
      renderValueAccordingToContext: jest.fn().mockImplementation((value) => value),
    };

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn(),
      setCurrentStepState: jest.fn(),
    } as any;

    node = {
      id: 'enterSwitch_testStep',
      type: 'enter-switch',
      stepId: 'testStep',
      stepType: 'switch',
      exitNodeId: 'exitSwitch_testStep',
      configuration: {
        name: 'testStep',
        type: 'switch',
        expression: '{{ steps.check.output.status }}',
      },
    } as EnterSwitchNode;

    mockWorkflowRuntime = {
      navigateToNode: jest.fn(),
    } as any;

    workflowGraph = {} as unknown as WorkflowGraph;
  });

  describe('matching case', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 'success',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterCase_testStep_1',
          type: 'enter-case-branch',
          match: 'failure',
          index: 1,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterDefault_testStep',
          type: 'enter-default-branch',
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterDefaultBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'success';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should navigate to the matching case branch', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_0');
    });

    it('should set input with expression details', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
        rawExpression: '{{ steps.check.output.status }}',
        expression: 'success',
      });
    });

    it('should set step state with matched value and index', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
        matchedValue: 'success',
        matchedIndex: 0,
      });
    });

    it('should log debug message for matched case', async () => {
      await impl.run();
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        expect.stringContaining('Matched case')
      );
    });
  });

  describe('second case match', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 'success',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterCase_testStep_1',
          type: 'enter-case-branch',
          match: 'failure',
          index: 1,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'failure';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should navigate to the second matching case branch', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_1');
    });

    it('should set step state with correct matched index', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
        matchedValue: 'failure',
        matchedIndex: 1,
      });
    });
  });

  describe('default branch fallback', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 'success',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterDefault_testStep',
          type: 'enter-default-branch',
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterDefaultBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'unknown_value';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should navigate to default branch when no case matches', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterDefault_testStep');
    });

    it('should set step state with undefined matchedValue', async () => {
      await impl.run();
      expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith({
        matchedValue: undefined,
        matchedIndex: -1,
      });
    });
  });

  describe('no match and no default', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 'success',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'unknown_value';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should navigate to exit node when no case matches and no default', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('exitSwitch_testStep');
    });
  });

  describe('numeric value matching', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 200,
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterCase_testStep_1',
          type: 'enter-case-branch',
          match: 404,
          index: 1,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return '404';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should match numeric values using string comparison', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_1');
    });
  });

  describe('error handling', () => {
    it('should throw if successors contain invalid types', async () => {
      workflowGraph.getDirectSuccessors = jest
        .fn()
        .mockReturnValue([{ id: 'someNode', type: 'invalid-type' }]);

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );

      await expect(impl.run()).rejects.toThrow(
        `EnterSwitchNode with id ${node.id} must have only 'enter-case-branch' or 'enter-default-branch' successors, but found: invalid-type.`
      );
    });
  });

  describe('dynamic value matching (expression in case value)', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: '{{ consts.expected_status }}',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterCase_testStep_1',
          type: 'enter-case-branch',
          match: 'static_value',
          index: 1,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'resolved_status';
        if (val === '{{ consts.expected_status }}') return 'resolved_status';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should render string case values as expressions before matching', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_0');
    });

    it('should call renderValueAccordingToContext for string case values', async () => {
      await impl.run();
      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
        '{{ consts.expected_status }}'
      );
    });
  });

  describe('numeric values are not rendered as expressions', () => {
    beforeEach(() => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 42,
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return '42';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );
    });

    it('should match numeric case values without rendering them', async () => {
      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_0');
    });

    it('should not render numeric values through the template engine', async () => {
      await impl.run();
      const renderCalls = mockContextManager.renderValueAccordingToContext.mock.calls;
      const renderedValues = renderCalls.map((call: unknown[]) => call[0]);
      expect(renderedValues).not.toContain(42);
    });
  });

  describe('case ordering', () => {
    it('should match cases by index order even if successors are unordered', async () => {
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'enterCase_testStep_1',
          type: 'enter-case-branch',
          match: 'b',
          index: 1,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
        {
          id: 'enterCase_testStep_0',
          type: 'enter-case-branch',
          match: 'a',
          index: 0,
          stepId: 'testStep',
          stepType: 'switch',
        } as EnterCaseBranchNode,
      ]);

      mockContextManager.renderValueAccordingToContext = jest.fn().mockImplementation((val) => {
        if (val === '{{ steps.check.output.status }}') return 'a';
        return val;
      });

      impl = new EnterSwitchNodeImpl(
        node,
        mockWorkflowRuntime,
        workflowGraph,
        mockStepExecutionRuntime,
        workflowContextLoggerMock
      );

      await impl.run();
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('enterCase_testStep_0');
    });
  });
});
