/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterConditionBranchNodeImpl } from '../enter_condition_branch_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';

describe('EnterConditionBranchNodeImpl', () => {
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: EnterConditionBranchNodeImpl;

  beforeEach(() => {
    wfExecutionRuntimeManagerMock = {
      goToNextStep: jest.fn(),
    } as any;
    impl = new EnterConditionBranchNodeImpl(wfExecutionRuntimeManagerMock);
  });

  it('should go to next step', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.goToNextStep).toHaveBeenCalledTimes(1);
  });
});
