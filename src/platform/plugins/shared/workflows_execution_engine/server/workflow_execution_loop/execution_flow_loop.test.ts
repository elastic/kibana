/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { executionFlowLoop } from './execution_flow_loop';

jest.mock('./run_node', () => ({
  runNode: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runNode } = require('./run_node');

describe('executionFlowLoop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls runNode while status is RUNNING and stops when terminal', async () => {
    let callCount = 0;
    const params = {
      workflowRuntime: {
        getWorkflowExecutionStatus: jest.fn(() => {
          callCount++;
          return callCount <= 3 ? ExecutionStatus.RUNNING : ExecutionStatus.COMPLETED;
        }),
      },
    } as any;

    await executionFlowLoop(params);

    expect(runNode).toHaveBeenCalledTimes(3);
  });

  it('does not call runNode when status is not RUNNING', async () => {
    const params = {
      workflowRuntime: {
        getWorkflowExecutionStatus: jest.fn(() => ExecutionStatus.COMPLETED),
      },
    } as any;

    await executionFlowLoop(params);

    expect(runNode).not.toHaveBeenCalled();
  });
});
