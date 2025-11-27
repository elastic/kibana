/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitSwitchCaseNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitSwitchCaseNodeImpl } from '../exit_switch_case_node_impl';

describe('ExitSwitchCaseNodeImpl', () => {
  let node: ExitSwitchCaseNode;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let workflowGraph: WorkflowGraph;
  let impl: ExitSwitchCaseNodeImpl;

  beforeEach(() => {
    node = {
      id: 'exitCase1',
      type: 'exit-switch-case',
      startNodeId: 'case1Node',
      stepId: 'testSwitchStep',
      stepType: 'switch',
    };

    mockWorkflowRuntime = {
      exitScope: jest.fn(),
      navigateToNode: jest.fn(),
    } as any;

    workflowGraph = {} as unknown as WorkflowGraph;
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([
      {
        id: 'exitSwitchNode',
        type: 'exit-switch',
      },
    ]);

    impl = new ExitSwitchCaseNodeImpl(node, workflowGraph, mockWorkflowRuntime);
  });

  it('should exit scope', () => {
    impl.run();

    expect(mockWorkflowRuntime.exitScope).toHaveBeenCalled();
  });

  it('should navigate to exit-switch node', () => {
    impl.run();

    expect(mockWorkflowRuntime.navigateToNode).toHaveBeenCalledWith('exitSwitchNode');
  });

  it('should throw error if exit-switch node not found', () => {
    workflowGraph.getDirectSuccessors = jest.fn().mockReturnValue([]);

    expect(() => impl.run()).toThrow(
      'ExitSwitchCaseNode exitCase1 must have an exit-switch successor, but none found.'
    );
  });
});
