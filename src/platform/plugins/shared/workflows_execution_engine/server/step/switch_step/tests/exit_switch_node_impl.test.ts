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
import { ExitSwitchNodeImpl } from '../exit_switch_node_impl';

describe('ExitSwitchNodeImpl', () => {
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let mockWorkflowRuntime: jest.Mocked<WorkflowExecutionRuntimeManager>;
  let impl: ExitSwitchNodeImpl;

  beforeEach(() => {
    mockStepExecutionRuntime = {
      getCurrentStepResult: jest.fn().mockReturnValue({
        input: {
          switchValue: 'active',
          selectedCase: 'active',
          evaluation: {
            matched: true,
            checkedCases: ['active', 'inactive'],
          },
        },
      }),
      finishStep: jest.fn(),
    } as any;

    mockWorkflowRuntime = {
      navigateToNextNode: jest.fn(),
    } as any;

    impl = new ExitSwitchNodeImpl(mockStepExecutionRuntime, mockWorkflowRuntime);
  });

  it('should finish step with output containing switchValue, selectedCase and evaluation', () => {
    impl.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      switchValue: 'active',
      selectedCase: 'active',
      evaluation: {
        matched: true,
        checkedCases: ['active', 'inactive'],
      },
    });
  });

  it('should handle default case in output', () => {
    mockStepExecutionRuntime.getCurrentStepResult = jest.fn().mockReturnValue({
      input: {
        switchValue: 'unknown',
        selectedCase: 'default',
        evaluation: {
          matched: false,
          checkedCases: ['active', 'inactive'],
        },
      },
    });

    impl.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      switchValue: 'unknown',
      selectedCase: 'default',
      evaluation: {
        matched: false,
        checkedCases: ['active', 'inactive'],
      },
    });
  });

  it('should handle null selectedCase when no match and no default', () => {
    mockStepExecutionRuntime.getCurrentStepResult = jest.fn().mockReturnValue({
      input: {
        switchValue: 'unknown',
        selectedCase: null,
        evaluation: {
          matched: false,
          checkedCases: ['active', 'inactive'],
        },
      },
    });

    impl.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalledWith({
      switchValue: 'unknown',
      selectedCase: null,
      evaluation: {
        matched: false,
        checkedCases: ['active', 'inactive'],
      },
    });
  });

  it('should finish step and navigate to next node', () => {
    impl.run();

    expect(mockStepExecutionRuntime.finishStep).toHaveBeenCalled();
    expect(mockWorkflowRuntime.navigateToNextNode).toHaveBeenCalled();
  });
});
