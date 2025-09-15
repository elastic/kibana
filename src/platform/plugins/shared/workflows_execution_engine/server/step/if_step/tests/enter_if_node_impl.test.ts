/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterIfNodeImpl } from '../enter_if_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { EnterConditionBranchNode, EnterIfNode } from '@kbn/workflows/graph';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowGraph } from '@kbn/workflows/graph';

describe('EnterIfNodeImpl', () => {
  let node: EnterIfNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: EnterIfNodeImpl;
  let workflowContextLoggerMock: IWorkflowEventLogger;
  let workflowContextManagerMock: WorkflowContextManager;
  let workflowGraph: WorkflowGraph;

  beforeEach(() => {
    workflowContextLoggerMock = {} as unknown as IWorkflowEventLogger;
    workflowContextLoggerMock.logDebug = jest.fn();
    workflowContextManagerMock = {} as unknown as WorkflowContextManager;
    workflowContextManagerMock.getContext = jest.fn().mockReturnValue({
      event: { type: 'alert' },
    });
    node = {
      id: 'testStep',
      type: 'enter-if',
      stepId: 'testStep',
      stepType: 'if',
      exitNodeId: 'exitIfNode',
      configuration: {} as any,
    };
    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.startStep = jest.fn();
    wfExecutionRuntimeManagerMock.navigateToNode = jest.fn();
    wfExecutionRuntimeManagerMock.enterScope = jest.fn();
    workflowGraph = {} as unknown as WorkflowGraph;
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'thenNode',
        type: 'enter-then-branch',
        condition: 'true',
      } as EnterConditionBranchNode,
      {
        id: 'elseNode',
        type: 'enter-else-branch',
      } as EnterConditionBranchNode,
    ]);
    impl = new EnterIfNodeImpl(
      node,
      wfExecutionRuntimeManagerMock,
      workflowGraph,
      workflowContextManagerMock,
      workflowContextLoggerMock
    );
  });

  it('should start the step', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalledWith();
  });

  it('should enter scope', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledWith();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
  });

  it('should be called after startStep', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalled();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalled();
    expect(
      (wfExecutionRuntimeManagerMock.startStep as jest.Mock).mock.invocationCallOrder[0]
    ).toBeLessThan(
      (wfExecutionRuntimeManagerMock.enterScope as jest.Mock).mock.invocationCallOrder[0]
    );
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
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledWith('thenNode');
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
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledWith('elseNode');
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
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledWith('exitIfNode');
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
      `EnterIfNode with id ${node.id} must have only 'enter-then-branch' or 'enter-else-branch' successors, but found: some-other-type.`
    );
  });

  it('should throw an error if condition evaluation fails', async () => {
    (workflowGraph.getDirectSuccessors as jest.Mock).mockReturnValueOnce([
      {
        id: 'thenNode',
        type: 'enter-then-branch',
        condition: 'invalid""condition',
      } as EnterConditionBranchNode,
    ]);
    await expect(impl.run()).rejects.toThrow();
  });
});
