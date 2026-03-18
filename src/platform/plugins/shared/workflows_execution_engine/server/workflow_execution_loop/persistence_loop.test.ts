/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import { persistenceLoop } from './persistence_loop';
import type { WorkflowExecutionLoopParams } from './types';

const createParams = (): jest.Mocked<WorkflowExecutionLoopParams> =>
  ({
    workflowRuntime: {
      getWorkflowExecutionStatus: jest.fn().mockReturnValue(ExecutionStatus.RUNNING),
    },
    workflowExecutionState: {
      flush: jest.fn().mockResolvedValue(undefined),
    },
    workflowLogger: {
      flushEvents: jest.fn().mockResolvedValue(undefined),
    },
    taskAbortController: new AbortController(),
  } as unknown as jest.Mocked<WorkflowExecutionLoopParams>);

describe('persistenceLoop', () => {
  it('resolves cleanly when the persistence signal is already aborted', async () => {
    const params = createParams();
    const persistenceAbortController = new AbortController();

    persistenceAbortController.abort();

    await expect(
      persistenceLoop(params, persistenceAbortController.signal)
    ).resolves.toBeUndefined();

    expect(params.workflowExecutionState.flush).not.toHaveBeenCalled();
    expect(params.workflowLogger.flushEvents).not.toHaveBeenCalled();
  });
});
