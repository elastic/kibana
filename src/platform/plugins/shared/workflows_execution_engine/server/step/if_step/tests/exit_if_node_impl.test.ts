/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitIfNodeImpl } from '../exit_if_node_impl';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';

describe('ExitIfNodeImpl', () => {
  let wfExecutionRuntimeManagerMock: WorkflowExecutionRuntimeManager;
  let impl: ExitIfNodeImpl;

  beforeEach(() => {
    wfExecutionRuntimeManagerMock = {} as unknown as WorkflowExecutionRuntimeManager;
    wfExecutionRuntimeManagerMock.navigateToNextNode = jest.fn();
    wfExecutionRuntimeManagerMock.finishStep = jest.fn();
    wfExecutionRuntimeManagerMock.exitScope = jest.fn();
    impl = new ExitIfNodeImpl(wfExecutionRuntimeManagerMock);
  });

  it('should exit scope', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.exitScope).toHaveBeenCalledTimes(1);
  });

  it('should finish enterIfNode', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.finishStep).toHaveBeenCalledTimes(1);
    expect(wfExecutionRuntimeManagerMock.finishStep).toHaveBeenCalledWith();
  });

  it('should go to the next node', async () => {
    await impl.run();
    expect(wfExecutionRuntimeManagerMock.navigateToNextNode).toHaveBeenCalledTimes(1);
  });
});
