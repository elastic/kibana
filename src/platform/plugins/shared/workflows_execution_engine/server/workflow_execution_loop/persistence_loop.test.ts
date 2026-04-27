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

const makeParams = (
  overrides: Partial<{
    status: ExecutionStatus;
    flushDelay?: number;
  }> = {}
): jest.Mocked<WorkflowExecutionLoopParams> => {
  const { status = ExecutionStatus.RUNNING, flushDelay = 0 } = overrides;
  return {
    workflowRuntime: {
      getWorkflowExecutionStatus: jest.fn().mockReturnValue(status),
    },
    workflowExecutionState: {
      flush: jest
        .fn()
        .mockImplementation(() => new Promise<void>((resolve) => setTimeout(resolve, flushDelay))),
    },
    workflowLogger: {
      flushEvents: jest.fn().mockResolvedValue(undefined),
    },
    taskAbortController: new AbortController(),
  } as unknown as jest.Mocked<WorkflowExecutionLoopParams>;
};

describe('persistenceLoop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('exits immediately when workflow status is not RUNNING', async () => {
    const params = makeParams({ status: ExecutionStatus.COMPLETED });
    await persistenceLoop(params);
    expect(params.workflowExecutionState.flush).not.toHaveBeenCalled();
  });

  it('exits when the persistenceAbortSignal fires during the wait interval', async () => {
    const abortController = new AbortController();
    const params = makeParams({ status: ExecutionStatus.RUNNING });

    // Make getWorkflowExecutionStatus always return RUNNING so only the signal stops the loop
    (params.workflowRuntime.getWorkflowExecutionStatus as jest.Mock).mockReturnValue(
      ExecutionStatus.RUNNING
    );

    const loopPromise = persistenceLoop(params, abortController.signal);

    // Flush is synchronous (0 ms delay), so after one tick it's waiting on the 500 ms interval.
    // Advance timers a little, then abort.
    jest.advanceTimersByTime(100);
    abortController.abort();
    jest.advanceTimersByTime(500);

    await expect(loopPromise).resolves.toBeUndefined();
  });

  it('does not cause an unhandled rejection when abort fires during flushState', async () => {
    // This is the core regression test for the crash:
    // If persistenceAbortController.abort() fires while `await flushState()` is running
    // (i.e. outside the Promise.race try-catch), it must NOT produce an unhandled rejection.

    const abortController = new AbortController();

    // flushState takes 50 ms — long enough for us to fire abort mid-flush
    const params = makeParams({ status: ExecutionStatus.RUNNING, flushDelay: 50 });
    (params.workflowRuntime.getWorkflowExecutionStatus as jest.Mock).mockReturnValue(
      ExecutionStatus.RUNNING
    );

    const unhandledRejectionSpy = jest.fn();
    process.on('unhandledRejection', unhandledRejectionSpy);

    const loopPromise = persistenceLoop(params, abortController.signal);

    // Fire abort while flush is in progress (before the 50 ms resolve)
    jest.advanceTimersByTime(10);
    abortController.abort();

    // Let flush complete and the loop settle
    jest.advanceTimersByTime(500);
    await loopPromise;

    // Give Node.js one more microtask tick to surface any unhandled rejection
    await Promise.resolve();

    expect(unhandledRejectionSpy).not.toHaveBeenCalled();

    process.off('unhandledRejection', unhandledRejectionSpy);
  });

  it('exits when the persistenceAbortSignal is already aborted before the loop starts', async () => {
    const abortController = new AbortController();
    abortController.abort();

    const params = makeParams({ status: ExecutionStatus.RUNNING });
    await persistenceLoop(params, abortController.signal);

    // The loop should return immediately without flushing
    expect(params.workflowExecutionState.flush).not.toHaveBeenCalled();
  });
});
