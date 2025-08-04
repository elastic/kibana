/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterIfNodeImpl } from '../enter_if_node_impl';
import { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterConditionBranchNode, EnterIfNode } from '@kbn/workflows';

describe('EnterIfNodeImpl', () => {
  let step: EnterIfNode;
  let workflowState: WorkflowExecutionRuntimeManager;
  let impl: EnterIfNodeImpl;
  let startStep: jest.Mock<any, any, any>;
  let goToStep: jest.Mock<any, any, any>;
  let getNodeSuccessors: jest.Mock<any, any, any>;

  beforeEach(() => {
    startStep = jest.fn();
    goToStep = jest.fn();
    getNodeSuccessors = jest.fn();
    step = { id: 'testStep', type: 'enter-if', exitNodeId: 'exitIfNode', configuration: {} as any };
    workflowState = {
      startStep,
      goToStep,
      getNodeSuccessors,
    } as any;
    impl = new EnterIfNodeImpl(step, workflowState);

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

  it('should start the step and go to the next step', async () => {
    await impl.run();
    expect(workflowState.startStep).toHaveBeenCalledWith(step.id);
  });

  it('should evaluate condition and go to thenNode if condition is true', async () => {
    getNodeSuccessors.mockReturnValueOnce([
      { id: 'thenNode', condition: 'true' },
      { id: 'elseNode' },
    ]);
    await impl.run();
    expect(workflowState.goToStep).toHaveBeenCalledTimes(1);
    expect(workflowState.goToStep).toHaveBeenCalledWith('thenNode');
  });

  it('should evaluate condition and go to elseNode if condition is false', async () => {
    getNodeSuccessors.mockReturnValueOnce([
      { id: 'thenNode', condition: 'false' },
      { id: 'elseNode' },
    ]);
    await impl.run();
    expect(workflowState.goToStep).toHaveBeenCalledTimes(1);
    expect(workflowState.goToStep).toHaveBeenCalledWith('elseNode');
  });

  it('should evaluate condition and go to exit node if no else branch is defined', async () => {
    getNodeSuccessors.mockReturnValueOnce([{ id: 'thenNode', condition: 'false' }]);
    await impl.run();
    expect(workflowState.goToStep).toHaveBeenCalledTimes(1);
    expect(workflowState.goToStep).toHaveBeenCalledWith('exitIfNode');
  });
});
