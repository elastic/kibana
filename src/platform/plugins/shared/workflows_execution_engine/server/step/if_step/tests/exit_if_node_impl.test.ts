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
import { ExitIfNodeImpl } from '../exit_if_node_impl';

describe('ExitIfNodeImpl', () => {
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: ExitIfNodeImpl;

  beforeEach(() => {
    mockStepExecutionRuntime = {
      finishStep: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    impl = new ExitIfNodeImpl(mockStepExecutionRuntime, mockWorkflowRuntime);
  });

  it('should finish step', async () => {
    await impl.run();
    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledTimes(1);
    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith();
  });

  it('should go to the next node', async () => {
    await impl.run();
    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });
});
