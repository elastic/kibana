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
import type { EnterConditionBranchNode, EnterIfNode } from '@kbn/workflows';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';
import type { WorkflowGraph } from '@kbn/workflows/graph';

describe('EnterIfNodeImpl', () => {
  let step: EnterIfNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: EnterIfNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let goToStep: jest.Mock<any, any, any>;
  let getDirectSuccessors: jest.Mock<any, any, any>;
  let enterScope: jest.Mock<any, any, any>;
  let workflowContextLoggerMock: IWorkflowEventLogger;
  let workflowContextManagerMock: WorkflowContextManager;

  beforeEach(() => {
    startStep = jest.fn();
    goToStep = jest.fn();
    enterScope = jest.fn();
    getDirectSuccessors = jest.fn();
    workflowContextLoggerMock = {
      logDebug: jest.fn(),
    } as unknown as IWorkflowEventLogger;
    workflowContextManagerMock = {
      getContext: jest.fn().mockReturnValue({
        event: { type: 'alert' },
      }),
    } as unknown as WorkflowContextManager;
    step = {
      id: 'testStep',
      type: 'enter-if',
      exitNodeId: 'exitIfNode',
      configuration: {} as any,
    };
    wfExecutionRuntimeManagerMock = {
      startStep,
      goToStep,
      enterScope,
    } as any;
    const workflowGraph: WorkflowGraph = {
      getDirectSuccessors,
    } as any;
    impl = new EnterIfNodeImpl(
      step,
      wfExecutionRuntimeManagerMock,
      workflowGraph,
      workflowContextManagerMock,
      workflowContextLoggerMock
    );

    getDirectSuccessors.mockReturnValue([
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
  });

  it('should start the step', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalledWith(step.id);
  });

  it('should enter scope', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledWith();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
  });

  it('should be called after startStep', async () => {
    await impl.run();
    expect(startStep).toHaveBeenCalled();
    expect(enterScope).toHaveBeenCalled();
    expect(startStep.mock.invocationCallOrder[0]).toBeLessThan(
      enterScope.mock.invocationCallOrder[0]
    );
  });

  describe('then branch', () => {
    beforeEach(() => {
      getDirectSuccessors.mockReturnValueOnce([
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
      getDirectSuccessors.mockReturnValueOnce([
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
      getDirectSuccessors.mockReturnValueOnce([
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
    getDirectSuccessors.mockReturnValueOnce([{ id: 'someOtherNode', type: 'some-other-type' }]);
    await expect(impl.run()).rejects.toThrow(
      `EnterIfNode with id ${step.id} must have only 'enter-then-branch' or 'enter-else-branch' successors, but found: some-other-type.`
    );
  });

  it('should throw an error if condition evaluation fails', async () => {
    getDirectSuccessors.mockReturnValueOnce([
      {
        id: 'thenNode',
        type: 'enter-then-branch',
        condition: 'invalid""condition',
      } as EnterConditionBranchNode,
    ]);
    await expect(impl.run()).rejects.toThrow();
  });
});
