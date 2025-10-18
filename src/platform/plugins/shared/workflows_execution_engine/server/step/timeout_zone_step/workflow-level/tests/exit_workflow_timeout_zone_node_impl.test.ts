/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitWorkflowTimeoutZoneNodeImpl } from '../exit_workflow_timeout_zone_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { StepExecutionRuntime } from '../../../../workflow_context_manager/step_execution_runtime';

describe('ExitWorkflowTimeoutZoneNodeImpl', () => {
  let stepExecutionRuntimeMock: StepExecutionRuntime;
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: ExitWorkflowTimeoutZoneNodeImpl;

  beforeEach(() => {
    stepExecutionRuntimeMock = {
      finishStep: jest.fn().mockResolvedValue(undefined),
    } as unknown as StepExecutionRuntime;

    wfExecutionRuntimeManagerMock = {
      navigateToNextNode: jest.fn(),
    } as unknown as WorkflowExecutionRuntimeManager;

    impl = new ExitWorkflowTimeoutZoneNodeImpl(
      stepExecutionRuntimeMock,
      wfExecutionRuntimeManagerMock
    );
  });

  it('should finish step', async () => {
    await impl.run();
    expect(stepExecutionRuntimeMock.finishStep).toHaveBeenCalledTimes(1);
    expect(stepExecutionRuntimeMock.finishStep).toHaveBeenCalledWith();
  });

  it('should navigate to next node', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
  });

  it('should execute methods in correct order', async () => {
    const callOrder: string[] = [];

    stepExecutionRuntimeMock.finishStep = jest.fn().mockImplementation(() => {
      callOrder.push('finishStep');
      return Promise.resolve();
    });
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn().mockImplementation(() => {
      callOrder.push('navigateToNextNode');
    });

    await impl.run();

    expect(callOrder).toEqual(['finishStep', 'navigateToNextNode']);
  });
});
