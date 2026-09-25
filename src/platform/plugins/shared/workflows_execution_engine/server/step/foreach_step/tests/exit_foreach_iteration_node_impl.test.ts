/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import { ExitForeachIterationNodeImpl } from '../exit_foreach_iteration_node_impl';

describe('ExitForeachIterationNodeImpl', () => {
  let workflowExecutionRuntimeManager: WorkflowExecutionRuntimeManager;
  let stepExecutionRuntime: StepExecutionRuntime;
  let underTest: ExitForeachIterationNodeImpl;

  beforeEach(() => {
    workflowExecutionRuntimeManager = {} as unknown as WorkflowExecutionRuntimeManager;
    workflowExecutionRuntimeManager.navigateToNextNode = jest.fn();

    stepExecutionRuntime = {
      finishStep: jest.fn(),
    } as unknown as StepExecutionRuntime;

    underTest = new ExitForeachIterationNodeImpl(
      stepExecutionRuntime,
      workflowExecutionRuntimeManager
    );
  });

  it('should finish the iteration step', () => {
    underTest.run();

    expect(stepExecutionRuntime.finishStep).toHaveBeenCalledWith();
  });

  it('should go to the next node', () => {
    underTest.run();

    expect(workflowExecutionRuntimeManager.navigateToNextNode).toHaveBeenCalled();
  });
});
