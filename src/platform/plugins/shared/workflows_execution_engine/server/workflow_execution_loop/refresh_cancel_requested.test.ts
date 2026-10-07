/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CANCEL_REFRESH_INTERVAL_MS,
  refreshCancelRequestedInBackground,
} from './refresh_cancel_requested';
import type { WorkflowExecutionLoopParams } from './types';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('refreshCancelRequestedInBackground', () => {
  let getWorkflowExecutionById: jest.Mock;
  let updateWorkflowExecution: jest.Mock;
  let logError: jest.Mock;
  let workflowExecution: { id: string; spaceId: string; cancelRequested?: boolean };
  let params: WorkflowExecutionLoopParams;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    getWorkflowExecutionById = jest.fn().mockResolvedValue({ cancelRequested: true });
    updateWorkflowExecution = jest.fn();
    logError = jest.fn();
    workflowExecution = { id: 'exec-1', spaceId: 'default' };
    params = {
      workflowExecutionRepository: { getWorkflowExecutionById },
      workflowExecutionState: {
        getWorkflowExecution: () => workflowExecution,
        updateWorkflowExecution,
      },
      workflowLogger: { logError },
    } as unknown as WorkflowExecutionLoopParams;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets cancelRequested in memory when Elasticsearch reports it', async () => {
    refreshCancelRequestedInBackground(params);
    await flushPromises();

    expect(getWorkflowExecutionById).toHaveBeenCalledWith('exec-1', 'default');
    expect(updateWorkflowExecution).toHaveBeenCalledWith({ cancelRequested: true });
  });

  it('does not read when cancelRequested is already set in memory', async () => {
    workflowExecution.cancelRequested = true;
    refreshCancelRequestedInBackground(params);
    await flushPromises();

    expect(getWorkflowExecutionById).not.toHaveBeenCalled();
  });

  it('throttles reads to one per interval and reads again afterwards', async () => {
    getWorkflowExecutionById.mockResolvedValue({ cancelRequested: false });

    refreshCancelRequestedInBackground(params);
    refreshCancelRequestedInBackground(params);
    expect(getWorkflowExecutionById).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(CANCEL_REFRESH_INTERVAL_MS);
    refreshCancelRequestedInBackground(params);
    await flushPromises();

    expect(getWorkflowExecutionById).toHaveBeenCalledTimes(2);
    expect(updateWorkflowExecution).not.toHaveBeenCalled();
  });

  it('logs and swallows read errors', async () => {
    getWorkflowExecutionById.mockRejectedValue(new Error('es down'));

    refreshCancelRequestedInBackground(params);
    await flushPromises();

    expect(logError).toHaveBeenCalledWith(
      'Failed to check workflow cancellation status - continuing execution',
      expect.any(Error)
    );
    expect(updateWorkflowExecution).not.toHaveBeenCalled();
  });
});
