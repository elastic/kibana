/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterSwitchCaseNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterSwitchCaseNodeImpl } from '../enter_switch_case_node_impl';

describe('EnterSwitchCaseNodeImpl', () => {
  let node: EnterSwitchCaseNode;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: EnterSwitchCaseNodeImpl;

  beforeEach(() => {
    node = {
      id: 'case1Node',
      type: 'enter-switch-case',
      caseName: 'active',
      match: 'active',
      stepId: 'testSwitchStep',
      stepType: 'switch',
    };

    mockWorkflowRuntime = {
      enterScope: jest.fn(),
      navigateToNextNode: jest.fn(),
    } as any;

    impl = new EnterSwitchCaseNodeImpl(node, mockWorkflowRuntime);
  });

  it('should enter scope with case name', () => {
    impl.run();

    expect(mockWorkflowRuntime.enterScope).toHaveBeenCalledWith('active');
  });

  it('should navigate to next node', () => {
    impl.run();

    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });
});
