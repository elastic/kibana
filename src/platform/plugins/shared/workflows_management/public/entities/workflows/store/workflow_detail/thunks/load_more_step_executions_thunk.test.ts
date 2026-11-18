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

import { loadExecutionThunk } from './load_execution_thunk';
import {
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../../../common';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { setExecution, setStepExecutionPages, setStepExecutionsTotal } from '../slice';

const mockGetExecutionSteps = jest.fn();
const mockGetExecution = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecutionSteps: mockGetExecutionSteps,
    getExecution: mockGetExecution,
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

describe('loadExecutionThunk pagination', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecutionSteps.mockReset();
    mockGetExecution.mockReset();
    mockGetExecution.mockResolvedValue(mockExecution);
    store = createMockStore();
    mockServices = getMockServices(store);
    store.dispatch(setExecution(mockExecution));
    store.dispatch(setStepExecutionPages([firstPage]));
    store.dispatch(setStepExecutionsTotal(5500));
  });

  it('should append the next page and update the total', async () => {
    mockGetExecutionSteps.mockResolvedValue({
      results: secondPage,
      total: 2,
      page: 2,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });

    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(mockGetExecution).not.toHaveBeenCalled();
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

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(result.meta.requestStatus).toBe('rejected');
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage]);
    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'nope',
      expect.objectContaining({ title: 'Failed to load more step executions' })
    );
  });

  it('should refresh all pages when Show more observes the run finishing', async () => {
    const runningRows = firstPage.map((step) => ({ ...step, status: ExecutionStatus.RUNNING }));
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    store.dispatch(setStepExecutionPages([runningRows]));
    mockGetExecutionSteps.mockImplementation(async (_id: string, { page }: { page: number }) => ({
      results: page === 1 ? firstPage : secondPage,
      total: 5500,
      page,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    }));

    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(2);
    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.COMPLETED);
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

    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(store.getState().detail.stepExecutionPages).toEqual([]);
  });

  it('does not overlap a poll with Show more', async () => {
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    const response = Promise.withResolvers<typeof mockExecution>();
    mockGetExecution.mockReturnValue(response.promise);
    mockGetExecutionSteps.mockResolvedValue({ results: firstPage, total: 5500 });
    const polling = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
    const loadMore = await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    response.resolve(mockExecution);
    await polling;

    expect(loadMore.meta.requestStatus).toBe('rejected');
    expect(mockGetExecution).toHaveBeenCalledTimes(1);
    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual([1, 2]);
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage, firstPage]);
  });

  it('ignores polling and double clicks while a page is loading', async () => {
    const response = Promise.withResolvers<{ results: typeof secondPage; total: number }>();
    mockGetExecutionSteps.mockReturnValue(response.promise);
    const first = store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
    response.resolve({ results: secondPage, total: 5500 });
    await first;

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage, secondPage]);
  });

  it('retries the same page after a failed Show more without hiding loaded data', async () => {
    mockGetExecutionSteps
      .mockRejectedValueOnce(new Error('Page failed'))
      .mockResolvedValue({ results: secondPage, total: 5500 });
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage]);
    expect(store.getState().detail.stepExecutionsTotal).toBe(5500);
    expect(store.getState().detail.executionError).toBeUndefined();
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual([2, 2]);
    expect(store.getState().detail.stepExecutionPages).toEqual([firstPage, secondPage]);
  });

  it('keeps page boundaries when an earlier page has missing documents', async () => {
    store.dispatch(setExecution({ ...mockExecution, stepExecutionIds: ['s1'] }));
    store.dispatch(setStepExecutionPages([[], firstPage]));
    store.dispatch(setStepExecutionsTotal(11000));
    mockGetExecutionSteps.mockResolvedValue({ results: secondPage, total: 11000 });
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));

    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 3,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    expect(store.getState().detail.stepExecutionPages).toEqual([[], firstPage, secondPage]);
    expect(store.getState().detail.execution?.stepExecutions).toEqual([
      ...firstPage,
      ...secondPage,
    ]);
  });

  it('does not request pages beyond the page limit', async () => {
    store.dispatch(
      setStepExecutionPages(
        Array.from({ length: WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT }, () => firstPage)
      )
    );
    store.dispatch(setStepExecutionsTotal(20000));
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    expect(mockGetExecutionSteps).not.toHaveBeenCalled();
  });

  it('does not load another page when all pages have been loaded', async () => {
    store.dispatch(setStepExecutionsTotal(1000));
    await store.dispatch(loadExecutionThunk({ id: 'exec-1', loadMore: true }));
    expect(mockGetExecutionSteps).not.toHaveBeenCalled();
  });
});
