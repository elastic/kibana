/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionListDto } from '@kbn/workflows';
import { loadExecutionThunk } from './load_execution_thunk';
import { createMockStore } from '../../__mocks__/store.mock';
import { setExecution, setStepExecutionPages, setStepExecutionsTotal } from '../slice';

const mockGetExecution = jest.fn();
const mockGetExecutionSteps = jest.fn();
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecution: mockGetExecution,
    getExecutionSteps: mockGetExecutionSteps,
  })),
}));
jest.mock('../utils/computation', () => ({
  performComputation: jest.fn(() => ({ yamlString: 'test' })),
}));

const execution: WorkflowExecutionDto = {
  id: 'exec-a',
  spaceId: 'default',
  workflowId: 'workflow',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-09-24T00:00:00Z',
  finishedAt: '2026-09-24T00:01:00Z',
  duration: 60000,
  error: null,
  yaml: 'name: test',
  workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
  stepExecutions: [],
};

const stepPage = (page: number, total: number): WorkflowStepExecutionListDto => ({
  // Sparse pages model documents missing from mget without losing pagination boundaries.
  results: [
    { id: `step-${page}`, stepId: `step-${page}`, status: ExecutionStatus.COMPLETED },
  ] as WorkflowStepExecutionListDto['results'],
  page,
  total,
  size: 5000,
});

describe('execution autoloading', () => {
  beforeEach(() => {
    mockGetExecution.mockReset().mockResolvedValue(execution);
    mockGetExecutionSteps
      .mockReset()
      .mockImplementation(async (_id, { page }) => stepPage(page, 5001));
  });

  it('uses two 5000-step requests for the 10000-step automatic budget', async () => {
    const store = createMockStore();
    mockGetExecutionSteps.mockImplementation(async (_id, { page }) => stepPage(page, 15001));

    await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(mockGetExecutionSteps.mock.calls).toEqual([
      [execution.id, { page: 1, size: 5000 }],
      [execution.id, { page: 2, size: 5000 }],
    ]);
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
    expect(store.getState().detail.stepExecutionsTotal).toBe(15001);
  });

  it('loads every page once, including the final step, without a Show more action', async () => {
    const store = createMockStore();
    await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual([1, 2]);
    expect(store.getState().detail.execution?.stepExecutions.map(({ id }) => id)).toEqual([
      'step-1',
      'step-2',
    ]);
  });

  it('discovers new pages on the next poll and refreshes each page only once', async () => {
    const store = createMockStore();
    mockGetExecution.mockResolvedValue({ ...execution, status: ExecutionStatus.RUNNING });
    mockGetExecutionSteps.mockImplementation(async (_id, { page }) => stepPage(page, 999));
    await store.dispatch(loadExecutionThunk({ id: execution.id }));
    mockGetExecutionSteps
      .mockClear()
      .mockImplementation(async (_id, { page }) => stepPage(page, 5001));

    await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual([1, 2]);
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
  });

  it('waits for the final page before committing terminal status', async () => {
    const store = createMockStore();
    store.dispatch(setExecution({ ...execution, status: ExecutionStatus.RUNNING }));
    const lastPage = Promise.withResolvers<WorkflowStepExecutionListDto>();
    mockGetExecutionSteps.mockImplementation(async (_id, { page }) =>
      page === 2 ? lastPage.promise : stepPage(page, 5001)
    );
    const request = store.dispatch(loadExecutionThunk({ id: execution.id }));
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockGetExecutionSteps).toHaveBeenCalledWith(execution.id, { page: 2, size: 5000 });
    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.RUNNING);
    lastPage.resolve(stepPage(2, 5001));
    await request;
    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
  });

  it('automatically loads at most 10000 steps and keeps the remaining total visible', async () => {
    const store = createMockStore();
    mockGetExecutionSteps.mockImplementation(async (_id, { page }) => stepPage(page, 15001));
    await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual(
      Array.from({ length: 2 }, (_, index) => index + 1)
    );
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
    expect(store.getState().detail.stepExecutionsTotal).toBe(15001);
  });

  it('allows manual continuation beyond the automatic budget for runs with step IDs', async () => {
    const store = createMockStore();
    const modernExecution = { ...execution, stepExecutionIds: ['step-1'] };
    store.dispatch(setExecution(modernExecution));
    store.dispatch(
      setStepExecutionPages(Array.from({ length: 2 }, (_, i) => stepPage(i + 1, 11000).results))
    );
    store.dispatch(setStepExecutionsTotal(11000));
    mockGetExecutionSteps.mockResolvedValue(stepPage(3, 11000));

    await store.dispatch(loadExecutionThunk({ id: execution.id, loadMore: true }));

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
    expect(mockGetExecutionSteps).toHaveBeenCalledWith(execution.id, { page: 3, size: 5000 });
    expect(store.getState().detail.stepExecutionPages).toHaveLength(3);
  });

  it('keeps the previous complete snapshot when a later automatic page fails', async () => {
    const store = createMockStore();
    const previous = { ...execution, status: ExecutionStatus.RUNNING };
    store.dispatch(setExecution(previous));
    mockGetExecutionSteps.mockImplementation(async (_id, { page }) => {
      if (page === 2) throw new Error('Page failed');
      return stepPage(page, 5001);
    });

    const result = await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(result.meta.requestStatus).toBe('rejected');
    expect(store.getState().detail.execution).toEqual(previous);
    expect(store.getState().detail.executionError?.message).toBe('Page failed');
  });

  it('does not refetch the automatically loaded pages of a completed run', async () => {
    const store = createMockStore();
    await store.dispatch(loadExecutionThunk({ id: execution.id }));
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
    mockGetExecutionSteps.mockClear();

    await store.dispatch(loadExecutionThunk({ id: execution.id }));

    expect(mockGetExecutionSteps).not.toHaveBeenCalled();
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
  });

  it('limits concurrent page requests and stops scheduling pages after switching executions', async () => {
    const store = createMockStore();
    const batch = Promise.withResolvers<WorkflowStepExecutionListDto>();
    const batchStarted = Promise.withResolvers<void>();
    mockGetExecution.mockImplementation(async (id: string) => ({ ...execution, id }));
    mockGetExecutionSteps.mockImplementation(async (id: string, { page }: { page: number }) => {
      if (id === 'exec-b') return stepPage(1, 0);
      if (page === 1) return stepPage(1, 30000);
      if (page === 4) batchStarted.resolve();
      return batch.promise;
    });
    store.dispatch(setExecution({ ...execution, status: ExecutionStatus.RUNNING }));
    store.dispatch(
      setStepExecutionPages(Array.from({ length: 6 }, () => stepPage(1, 30000).results))
    );
    const firstRequest = store.dispatch(loadExecutionThunk({ id: execution.id }));
    await batchStarted.promise;
    expect(mockGetExecutionSteps.mock.calls.map(([, params]) => params.page)).toEqual([1, 2, 3, 4]);

    await store.dispatch(loadExecutionThunk({ id: 'exec-b' }));
    batch.resolve(stepPage(2, 30000));
    await firstRequest;

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(5);
    expect(store.getState().detail.execution?.id).toBe('exec-b');
    expect(store.getState().detail.stepExecutionPages).toHaveLength(1);
  });
});
