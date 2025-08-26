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

describe('EnterIfNodeImpl', () => {
  let step: EnterIfNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: EnterIfNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let goToStep: jest.Mock<any, any, any>;
  let getNodeSuccessors: jest.Mock<any, any, any>;
  let enterScope: jest.Mock<any, any, any>;
  let workflowContextLoggerMock: IWorkflowEventLogger;
  let workflowContextManagerMock: WorkflowContextManager;

  beforeEach(() => {
    startStep = jest.fn();
    goToStep = jest.fn();
    enterScope = jest.fn();
    getNodeSuccessors = jest.fn();
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
      getNodeSuccessors,
      enterScope,
    } as any;
    impl = new EnterIfNodeImpl(
      step,
      wfExecutionRuntimeManagerMock,
      workflowContextManagerMock,
      workflowContextLoggerMock
    );

    getNodeSuccessors.mockReturnValue([
      {
        id: 'thenNode',
        type: 'enter-condition-branch',
        condition: 'true',
      } as EnterConditionBranchNode,
      {
        id: 'elseNode',
        type: 'enter-condition-branch',
      } as EnterConditionBranchNode,
    ]);
  });

  it('should start the step', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.startStep).toHaveBeenCalledWith(step.id);
  });

  it('should enter scope', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
  });

  describe('then branch', () => {
    beforeEach(() => {
      getNodeSuccessors.mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-condition-branch',
          condition: 'event.type:alert',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-condition-branch',
        } as EnterConditionBranchNode,
      ]);
    });
    it('should evaluate condition and go to thenNode if condition is true', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledWith('thenNode');
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
      getNodeSuccessors.mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-condition-branch',
          condition: 'event.type:rule',
        } as EnterConditionBranchNode,
        {
          id: 'elseNode',
          type: 'enter-condition-branch',
        } as EnterConditionBranchNode,
      ]);
    });
    it('should evaluate condition and go to elseNode if condition is false', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledWith('elseNode');
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
      getNodeSuccessors.mockReturnValueOnce([
        {
          id: 'thenNode',
          type: 'enter-condition-branch',
          condition: 'event.type:rule',
        } as EnterConditionBranchNode,
      ]);
    });

    it('should evaluate condition and go to exit node if no else branch is defined', async () => {
      await impl.run();
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledTimes(1);
      expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledWith('exitIfNode');
    });

    it('should log debug message for no else branch defined', async () => {
      await impl.run();
      expect(workflowContextLoggerMock.logDebug).toHaveBeenCalledWith(
        `Condition "event.type:rule" evaluated to false for step testStep. No else branch defined. Exiting if condition.`
      );
    });
  });

  it('should throw an error if successors are not enter-condition-branch', async () => {
    getNodeSuccessors.mockReturnValueOnce([{ id: 'someOtherNode', type: 'some-other-type' }]);
    await expect(impl.run()).rejects.toThrow(
      `EnterIfNode with id ${step.id} must have only 'enter-condition-branch' successors, but found: some-other-type.`
    );
  });

  it('should throw an error if condition evaluation fails', async () => {
    getNodeSuccessors.mockReturnValueOnce([
      {
        id: 'thenNode',
        type: 'enter-condition-branch',
        condition: 'invalid""condition',
      } as EnterConditionBranchNode,
    ]);
    await expect(impl.run()).rejects.toThrow();
  });
});
