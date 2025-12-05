/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterConditionBranchNodeImpl } from '../enter_condition_branch_node_impl';

describe('EnterConditionBranchNodeImpl', () => {
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: EnterConditionBranchNodeImpl;
  const conditionBranchNode = {
    id: 'testStep',
    type: 'enter-then-branch',
  } as any;

  beforeEach(() => {
    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManagerMock.enterScope = jest.fn();
    impl = new EnterConditionBranchNodeImpl(conditionBranchNode, wfExecutionRuntimeManagerMock);
  });

  it('should go to next node', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
  });

  it('should enter true scope for enter-then-branch', async () => {
    conditionBranchNode.type = 'enter-then-branch';
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledWith('true');
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
  });

  it('should enter false scope for enter-else-branch', async () => {
    conditionBranchNode.type = 'enter-else-branch';
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledWith('false');
    expect(wfExecutionRuntimeManagerMock.enterScope).toHaveBeenCalledTimes(1);
  });
});
