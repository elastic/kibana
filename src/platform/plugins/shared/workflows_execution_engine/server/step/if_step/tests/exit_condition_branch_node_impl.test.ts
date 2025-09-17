/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitConditionBranchNode, ExitIfNode } from '@kbn/workflows';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitConditionBranchNodeImpl } from '../exit_condition_branch_node_impl';

describe('ExitConditionBranchNodeImpl', () => {
  let step: ExitConditionBranchNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: ExitConditionBranchNodeImpl;
  let goToStep: jest.Mock<any, any, any>;
  let getNodeSuccessors: jest.Mock<any, any, any>;

  beforeEach(() => {
    goToStep = jest.fn();
    getNodeSuccessors = jest.fn();
    step = {
      id: 'testStep',
      type: 'exit-then-branch',
      startNodeId: 'startBranchNode',
    };
    wfExecutionRuntimeManagerMock = {
      goToStep,
      getNodeSuccessors,
      exitScope: jest.fn(),
    } as any;
    impl = new ExitConditionBranchNodeImpl(step, wfExecutionRuntimeManagerMock);

    getNodeSuccessors.mockReturnValue([
      {
        id: 'exitIfNode',
        type: 'exit-if',
      } as ExitIfNode,
    ]);
  });

  it('should raise an error if there are multiple successors', async () => {
    getNodeSuccessors.mockReturnValue([
      { id: 'exitIfNode1', type: 'exit-if' },
      { id: 'exitIfNode2', type: 'exit-if' },
    ]);

    await expect(impl.run()).rejects.toThrow(
      `ExitConditionBranchNode with id ${step.id} must have exactly one successor, but found 2.`
    );
  });

  it('should raise an error if no successors', async () => {
    getNodeSuccessors.mockReturnValue([]);

    await expect(impl.run()).rejects.toThrow(
      `ExitConditionBranchNode with id ${step.id} must have exactly one successor, but found 0.`
    );
  });

  it('should raise an error if successor is not exit-if', async () => {
    getNodeSuccessors.mockReturnValue([{ id: 'someOtherNode', type: 'some-other-type' }]);
    await expect(impl.run()).rejects.toThrow(
      `ExitConditionBranchNode with id ${step.id} must have an exit-if successor, but found some-other-type with id someOtherNode.`
    );
  });

  it('should go to the exitIfNode after running', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.goToStep).toHaveBeenCalledWith('exitIfNode');
  });

  it('should exit scope after running', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.exitScope).toHaveBeenCalled();
    expect(wfExecutionRuntimeManagerMock.exitScope).toHaveBeenCalledTimes(1);
  });
});
