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

describe('ExitWorkflowTimeoutZoneNodeImpl', () => {
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: ExitWorkflowTimeoutZoneNodeImpl;

  beforeEach(() => {
    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.exitScope = jest.fn();
    wfExecutionRuntimeManagerMock.finishStep = jest.fn();
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn();
    impl = new ExitWorkflowTimeoutZoneNodeImpl(wfExecutionRuntimeManagerMock);
  });

  it('should exit scope', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.exitScope).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.exitScope).toHaveBeenCalledWith();
  });

  it('should finish step', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.finishStep).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.finishStep).toHaveBeenCalledWith();
  });

  it('should navigate to next node', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledWith();
  });

  it('should execute methods in correct order', async () => {
    const callOrder: string[] = [];

    wfExecutionRuntimeManagerMock.exitScope = jest.fn().mockImplementation(() => {
      callOrder.push('exitScope');
    });
    wfExecutionRuntimeManagerMock.finishStep = jest.fn().mockImplementation(() => {
      callOrder.push('finishStep');
      return Promise.resolve();
    });
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn().mockImplementation(() => {
      callOrder.push('navigateToNextNode');
    });

    await impl.run();

    expect(callOrder).toEqual(['exitScope', 'finishStep', 'navigateToNextNode']);
  });
});
