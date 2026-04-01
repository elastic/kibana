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
      getCurrentStepState: jest.fn().mockReturnValue(undefined),
      setCurrentStepState: jest.fn(),
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    impl = new ExitIfNodeImpl(mockStepExecutionRuntime, mockWorkflowRuntime);
  });

  it('should finish step with conditionResult from step state', () => {
    mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({ conditionResult: true });
    impl.run();
    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({ conditionResult: true });
  });

  it('should finish step with empty object when conditionResult is false', () => {
    mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({ conditionResult: false });
    impl.run();
    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({});
  });

  it('should finish step with empty object when step state is undefined', () => {
    mockStepExecutionRuntime.getCurrentStepState.mockReturnValue(undefined);
    impl.run();
    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({});
  });

  it('should clear step state after reading it', () => {
    mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({ conditionResult: true });
    impl.run();
    expect(mockStepExecutionRuntime.setCurrentStepState).toHaveBeenCalledWith(undefined);
  });

  it('should clear step state before calling finishStep', () => {
    const callOrder: string[] = [];
    mockStepExecutionRuntime.setCurrentStepState.mockImplementation(() => {
      callOrder.push('setCurrentStepState');
    });
    mockStepExecutionRuntime.finishStep.mockImplementation(() => {
      callOrder.push('finishStep');
    });
    mockStepExecutionRuntime.getCurrentStepState.mockReturnValue({ conditionResult: true });

    impl.run();
    expect(callOrder).toEqual(['setCurrentStepState', 'finishStep']);
  });

  it('should go to the next node', () => {
    impl.run();
    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalledTimes(1);
  });
});
