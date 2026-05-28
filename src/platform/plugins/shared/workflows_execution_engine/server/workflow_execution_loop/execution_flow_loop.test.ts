/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { executionFlowLoop } from './execution_flow_loop';
import { createMockWorkflowExecutionDriver } from '../workflow_context_manager/mocks/workflow_execution_driver.mock';

jest.mock('./run_node', () => ({
  runNode: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runNode } = require('./run_node');

describe('executionFlowLoop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls runNode while the execution driver is executing', async () => {
    let iterations = 0;
    const workflowExecutionDriver = createMockWorkflowExecutionDriver({
      currentNode: { id: 'node1' } as GraphNodeUnion,
    });
    workflowExecutionDriver.commitPendingNavigation.mockImplementation(() => {
      iterations += 1;
      if (iterations >= 3) {
        workflowExecutionDriver.setMockCurrentNode(null);
        workflowExecutionDriver.setMockIsExecuting(false);
      }
    });

    const params = {
      workflowExecutionDriver,
      workflowRuntime: {
        executionDriver: workflowExecutionDriver,
        saveState: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    await executionFlowLoop(params);

    expect(runNode).toHaveBeenCalledTimes(3);
    expect(workflowExecutionDriver.commitPendingNavigation).toHaveBeenCalledTimes(3);
  });

  it('stops the driver when there is no current node after navigation commit', async () => {
    const workflowExecutionDriver = createMockWorkflowExecutionDriver({
      currentNode: null,
    });

    const params = {
      workflowExecutionDriver,
      workflowRuntime: {
        executionDriver: workflowExecutionDriver,
        saveState: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    await executionFlowLoop(params);

    expect(runNode).toHaveBeenCalledTimes(1);
    expect(workflowExecutionDriver.stop).toHaveBeenCalled();
  });

  it('does not call runNode when execution driver is not executing', async () => {
    const workflowExecutionDriver = createMockWorkflowExecutionDriver({
      currentNode: { id: 'node1' } as GraphNodeUnion,
      isExecuting: false,
    });

    const params = {
      workflowExecutionDriver,
      workflowRuntime: {
        executionDriver: workflowExecutionDriver,
        saveState: jest.fn().mockResolvedValue(undefined),
      },
    } as any;

    await executionFlowLoop(params);

    expect(runNode).not.toHaveBeenCalled();
  });
});
