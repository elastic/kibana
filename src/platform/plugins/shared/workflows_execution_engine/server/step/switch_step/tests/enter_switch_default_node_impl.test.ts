/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterSwitchDefaultNode } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { EnterSwitchDefaultNodeImpl } from '../enter_switch_default_node_impl';

describe('EnterSwitchDefaultNodeImpl', () => {
  let node: EnterSwitchDefaultNode;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: EnterSwitchDefaultNodeImpl;

  beforeEach(() => {
    node = {
      id: 'defaultNode',
      type: 'enter-switch-default',
      stepId: 'testSwitchStep',
      stepType: 'switch',
    };

    mockWorkflowRuntime = {
      enterScope: jest.fn(),
      navigateToNextNode: jest.fn(),
    } as any;

    impl = new EnterSwitchDefaultNodeImpl(mockWorkflowRuntime);
  });

  it('should enter scope with "default"', () => {
    impl.run();

    expect(mockWorkflowRuntime.enterScope).toHaveBeenCalledWith('default');
  });

  it('should navigate to next node', () => {
    impl.run();

    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });
});
