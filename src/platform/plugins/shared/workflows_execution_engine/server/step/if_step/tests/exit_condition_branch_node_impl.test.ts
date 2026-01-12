/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitConditionBranchNode, ExitIfNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitConditionBranchNodeImpl } from '../exit_condition_branch_node_impl';

describe('ExitConditionBranchNodeImpl', () => {
  let node: ExitConditionBranchNode;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let workflowGraphMock: WorkflowGraph;
  let impl: ExitConditionBranchNodeImpl;

  beforeEach(() => {
    node = {
      id: 'testStep',
      type: 'exit-then-branch',
      stepId: 'testStep',
      stepType: 'if',
      startNodeId: 'startBranchNode',
    };
    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.navigateToNode = jest.fn();
    wfExecutionRuntimeManagerMock.exitScope = jest.fn();

    workflowGraphMock = {} as unknown as WorkflowGraph;
    impl = new ExitConditionBranchNodeImpl(node, workflowGraphMock, wfExecutionRuntimeManagerMock);

    workflowGraphMock.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'exitIfNode',
        type: 'exit-if',
      } as ExitIfNode,
    ]);
  });

  it('should raise an error if there are multiple successors', () => {
    workflowGraphMock.getDirectSuccessors = jest.fn().mockReturnValue([
      { id: 'exitIfNode1', type: 'exit-if' },
      { id: 'exitIfNode2', type: 'exit-if' },
    ]);

    expect(() => impl.run()).toThrow(
      `ExitConditionBranchNode with id ${node.id} must have exactly one successor, but found 2.`
    );
  });

  it('should raise an error if no successors', () => {
    workflowGraphMock.getDirectSuccessors = jest.fn().mockReturnValue([]);

    expect(() => impl.run()).toThrow(
      `ExitConditionBranchNode with id ${node.id} must have exactly one successor, but found 0.`
    );
  });

  it('should raise an error if successor is not exit-if', () => {
    workflowGraphMock.getDirectSuccessors = jest
      .fn()
      .mockReturnValue([{ id: 'someOtherNode', type: 'some-other-type' }]);
    expect(() => impl.run()).toThrow(
      `ExitConditionBranchNode with id ${node.id} must have an exit-if successor, but found some-other-type with id someOtherNode.`
    );
  });

  it('should go to the exitIfNode after running', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNode).toHaveBeenCalledWith('exitIfNode');
  });
});
