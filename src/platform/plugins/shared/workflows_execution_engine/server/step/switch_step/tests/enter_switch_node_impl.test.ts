/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EnterSwitchCaseNode,
  EnterSwitchDefaultNode,
  EnterSwitchNode,
  WorkflowGraph,
} from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
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
      getContext: jest.fn().mockReturnValue({
        steps: {
          getData: {
            output: {
              status: 'active',
            },
          },
        },
      }),
      renderValueAccordingToContext: jest.fn().mockImplementation((value) => {
        if (value === '{{ steps.getData.output.status }}') {
          return 'active';
        }
        return value;
      }),
    };

    mockStepExecutionRuntime = {
      contextManager: mockContextManager,
      startStep: jest.fn().mockResolvedValue(undefined),
      setInput: jest.fn(),
    } as any;

    node = {
      id: 'testSwitchStep',
      type: 'enter-switch',
      stepId: 'testSwitchStep',
      stepType: 'switch',
      exitNodeId: 'exitSwitchNode',
      configuration: {
        name: 'testSwitchStep',
        type: 'switch',
        switch: '{{ steps.getData.output.status }}',
      },
    };

    mockWorkflowRuntime = {
      navigateToNode: jest.fn(),
    } as any;

    workflowGraph = {} as unknown as WorkflowGraph;
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'case1Node',
        type: 'enter-switch-case',
        caseName: 'active',
        match: 'active',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
      {
        id: 'case2Node',
        type: 'enter-switch-case',
        caseName: 'inactive',
        match: 'inactive',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
      {
        id: 'defaultNode',
        type: 'enter-switch-default',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchDefaultNode,
    ]);

    impl = new EnterSwitchNodeImpl(
      node,
      mockWorkflowRuntime,
      workflowGraph,
      mockStepExecutionRuntime,
      workflowContextLoggerMock
    );
  });

  it('should start the step and evaluate switch expression', async () => {
    await impl.run();

    expect(mockStepExecutionRuntime.startStep).toHaveBeenCalled();
    expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
      '{{ steps.getData.output.status }}'
    );
  });

  it('should match first case when switch value matches', async () => {
    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
    expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
      'Case "active" matched for switch step testSwitchStep. Going to case branch.'
    );
  });

  it('should match second case when switch value matches second case', async () => {
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('inactive');

    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case2Node');
    expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
      'Case "inactive" matched for switch step testSwitchStep. Going to case branch.'
    );
  });

  it('should go to default when no case matches', async () => {
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('unknown');

    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('defaultNode');
    expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
      'No case matched for switch step testSwitchStep. Going to default branch.'
    );
  });

  it('should throw error when no case matches and no default', async () => {
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'case1Node',
        type: 'enter-switch-case',
        caseName: 'active',
        match: 'active',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
    ]);
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('unknown');

    await expect(impl.run()).rejects.toThrow(
      'No case matched and no default branch provided for switch step testSwitchStep.'
    );
  });

  it('should set step input with evaluation metadata', async () => {
    await impl.run();

    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
      switchValue: 'active',
      selectedCase: 'active',
      evaluation: {
        matched: true,
        checkedCases: ['active'], // Only includes cases checked before match
      },
    });
  });

  it('should set step input with default when no match', async () => {
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('unknown');

    await impl.run();

    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
      switchValue: 'unknown',
      selectedCase: 'default',
      evaluation: {
        matched: false,
        checkedCases: ['active', 'inactive'],
      },
    });
  });

  it('should match with strict equality', async () => {
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(42);
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'case1Node',
        type: 'enter-switch-case',
        caseName: 'number-case',
        match: 42,
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
    ]);

    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
  });

  it('should not match with different types', async () => {
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('42');
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'case1Node',
        type: 'enter-switch-case',
        caseName: 'number-case',
        match: 42,
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
      {
        id: 'defaultNode',
        type: 'enter-switch-default',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchDefaultNode,
    ]);

    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('defaultNode');
  });

  it('should throw error if successors are not switch case or default nodes', async () => {
    workflowGraph.getDirectSuccessors = jest
      .fn()
      .mockReturnValueOnce([{ id: 'someOtherNode', type: 'some-other-type' }]);

    await expect(impl.run()).rejects.toThrow(
      `EnterSwitchNode with id ${node.id} must have only 'enter-switch-case' or 'enter-switch-default' successors, but found: some-other-type`
    );
  });

  it('should check cases in order and stop at first match', async () => {
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'case1Node',
        type: 'enter-switch-case',
        caseName: 'first',
        match: 'value',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
      {
        id: 'case2Node',
        type: 'enter-switch-case',
        caseName: 'second',
        match: 'value',
        stepId: 'testSwitchStep',
        stepType: 'switch',
      } as EnterSwitchCaseNode,
    ]);
    mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('value');

    await impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
    expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
      switchValue: 'value',
      selectedCase: 'first',
      evaluation: {
        matched: true,
        checkedCases: ['first'], // Only includes cases checked before match
      },
    });
  });

  describe('expression evaluation', () => {
    it('should render switch expression using context manager', async () => {
      node.configuration.switch = '${{ inputs.a + inputs.b }}';
      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(15);
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'case1Node',
          type: 'enter-switch-case',
          caseName: 'sum-case',
          match: 15,
          stepId: 'testSwitchStep',
          stepType: 'switch',
        } as EnterSwitchCaseNode,
      ]);

      await impl.run();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
        '${{ inputs.a + inputs.b }}'
      );
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
      expect(mockStepExecutionRuntime.setInput).toHaveBeenCalledWith({
        switchValue: 15,
        selectedCase: 'sum-case',
        evaluation: {
          matched: true,
          checkedCases: ['sum-case'],
        },
      });
    });

    it('should render complex switch expressions using context manager', async () => {
      node.configuration.switch = '${{ inputs.a * 2 + inputs.b }}';
      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue(25);
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'case1Node',
          type: 'enter-switch-case',
          caseName: 'calculated-case',
          match: 25,
          stepId: 'testSwitchStep',
          stepType: 'switch',
        } as EnterSwitchCaseNode,
      ]);

      await impl.run();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
        '${{ inputs.a * 2 + inputs.b }}'
      );
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
    });

    it('should render switch expressions that return strings', async () => {
      node.configuration.switch = '${{ inputs.prefix + "-" + inputs.suffix }}';
      mockContextManager.renderValueAccordingToContext = jest.fn().mockReturnValue('test-value');
      workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
        {
          id: 'case1Node',
          type: 'enter-switch-case',
          caseName: 'string-case',
          match: 'test-value',
          stepId: 'testSwitchStep',
          stepType: 'switch',
        } as EnterSwitchCaseNode,
      ]);

      await impl.run();

      expect(mockContextManager.renderValueAccordingToContext).toHaveBeenCalledWith(
        '${{ inputs.prefix + "-" + inputs.suffix }}'
      );
      expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('case1Node');
    });
  });
});
