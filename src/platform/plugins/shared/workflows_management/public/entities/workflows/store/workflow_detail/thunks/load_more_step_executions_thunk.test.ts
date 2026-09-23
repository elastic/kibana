/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

import { loadMoreStepExecutionsThunk } from './load_more_step_executions_thunk';
import { WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE } from '../../../../../../common';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setExecution, setStepExecutionPages } from '../slice';

const mockGetExecutionSteps = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecutionSteps: mockGetExecutionSteps,
  })),
}));

const mockExecution: WorkflowExecutionDto = {
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  error: null,
  finishedAt: '2024-01-01T00:01:00Z',
  workflowId: 'wf-1',
  workflowName: 'Test Workflow',
  workflowDefinition: {
    name: 'Test',
    steps: [],
    triggers: [{ type: 'manual' }],
    version: '1',
    enabled: true,
  },
  stepExecutions: [],
  duration: 60000,
  yaml: 'name: Test\nsteps: []',
};

const firstPage = [
  { id: 's1', stepId: 's1', status: ExecutionStatus.COMPLETED },
] as WorkflowExecutionDto['stepExecutions'];
const secondPage = [
  { id: 's2', stepId: 's2', status: ExecutionStatus.COMPLETED },
] as WorkflowExecutionDto['stepExecutions'];

describe('loadMoreStepExecutionsThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();
    mockServices = getMockServices(store);
    store.dispatch(setExecution(mockExecution));
    store.dispatch(setStepExecutionPages([firstPage]));
  });

  it('should append the next page and update the total', async () => {
    mockGetExecutionSteps.mockResolvedValue({
      results: secondPage,
      total: 2,
      page: 2,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });

    await store.dispatch(loadMoreStepExecutionsThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 2,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    const { stepExecutionPages, stepExecutionsTotal, execution } = store.getState().detail;
    expect(stepExecutionPages).toEqual([firstPage, secondPage]);
    expect(stepExecutionsTotal).toBe(2);
    expect(execution?.stepExecutions).toEqual([...firstPage, ...secondPage]);
  });

  it('should leave the store unchanged and notify when the request fails', async () => {
    mockGetExecutionSteps.mockRejectedValue({ body: { message: 'nope' } });

    const result = await store.dispatch(loadMoreStepExecutionsThunk({ id: 'exec-1' }));

    expect(result.meta.requestStatus).toBe('rejected');
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage]);
    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'nope',
      expect.objectContaining({ title: 'Failed to load more step executions' })
    );
  });

  it('should refetch the page once when the run finished while it was in flight', async () => {
    const runningRows = [
      { id: 's2', stepId: 's2', status: ExecutionStatus.RUNNING },
    ] as WorkflowExecutionDto['stepExecutions'];
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    store.dispatch(setStepExecutionPages([firstPage]));
    mockGetExecutionSteps
      .mockImplementationOnce(async () => {
        // The final poll lands while this page is in flight.
        store.dispatch(setExecution(mockExecution));
        return {
          results: runningRows,
          total: 2,
          page: 2,
          size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
        };
      })
      .mockResolvedValueOnce({
        results: secondPage,
        total: 2,
        page: 2,
        size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
      });

    await store.dispatch(loadMoreStepExecutionsThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(2);
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage, secondPage]);
  });

  it('should drop the page when the execution changed while it was in flight', async () => {
    mockGetExecutionSteps.mockImplementation(async () => {
      store.dispatch(setExecution({ ...mockExecution, id: 'exec-2' }));
      return {
        results: secondPage,
        total: 2,
        page: 2,
        size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
      };
    });

    await store.dispatch(loadMoreStepExecutionsThunk({ id: 'exec-1' }));

    expect(store.getState().detail.stepExecutionPages).toEqual([]);
  });
});
