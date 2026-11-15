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
import { WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE } from '../../../../../../common';
import { createMockStore, getMockServices } from '../../__mocks__/store.mock';
import type { MockServices, MockStore } from '../../__mocks__/store.mock';
import { clearExecution, setExecution, setStepExecutionPages } from '../slice';

const mockGetExecution = jest.fn();
const mockGetExecutionSteps = jest.fn();

// Mock the WorkflowApi class so loadExecutionThunk uses our mock
jest.mock('@kbn/workflows-ui', () => ({
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecution: mockGetExecution,
    getExecutionSteps: mockGetExecutionSteps,
  })),
}));

// Mock the computation utility
jest.mock('../utils/computation', () => ({
  performComputation: jest.fn(() => ({
    yamlDocument: {},
    yamlLineCounter: {},
    workflowLookup: { steps: {} },
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

const mockStepsPage = {
  results: mockExecution.stepExecutions,
  total: 0,
  page: 1,
  size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
};

describe('loadExecutionThunk', () => {
  let store: MockStore;
  let mockServices: MockServices;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecution.mockReset();
    mockGetExecutionSteps.mockReset();

    store = createMockStore();
    mockServices = getMockServices(store);
    mockGetExecutionSteps.mockResolvedValue(mockStepsPage);
  });

  it('should load execution successfully', async () => {
    mockGetExecution.mockResolvedValue(mockExecution);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', {
      includeInput: false,
      includeOutput: true,
      omitStepExecutions: true,
    });
    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 1,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    expect(result.type).toBe('detail/loadExecutionThunk/fulfilled');
    expect(result.payload).toMatchObject({ execution: mockExecution });
  });

  it('should set execution in the store on success', async () => {
    mockGetExecution.mockResolvedValue(mockExecution);

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    const state = store.getState();
    expect(state.detail.execution).toEqual(mockExecution);
  });

  it('should compute execution data for a new execution id', async () => {
    const { performComputation } = jest.requireMock('../utils/computation');
    mockGetExecution.mockResolvedValue(mockExecution);

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(performComputation).toHaveBeenCalledWith(
      mockExecution.yaml,
      mockExecution.workflowDefinition
    );
  });

  it('should store stepExecutionsTotal when total exceeds the returned page', async () => {
    const pageResults = [{ id: 's1', stepId: 's1', status: ExecutionStatus.COMPLETED }];
    mockGetExecution.mockResolvedValue(mockExecution);
    mockGetExecutionSteps.mockResolvedValue({
      results: pageResults,
      total: 2,
      page: 1,
      size: 100,
    });

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(result.type).toBe('detail/loadExecutionThunk/fulfilled');
    expect(result.payload).toMatchObject({
      execution: { stepExecutions: pageResults },
    });
    expect(result.payload).not.toHaveProperty('stepExecutionsTruncatedCount');
    expect(store.getState().detail.stepExecutionsTotal).toBe(2);
  });

  it('should set stepExecutionsTotal to the page total when the page is complete', async () => {
    mockGetExecution.mockResolvedValue(mockExecution);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(result.payload).not.toHaveProperty('stepExecutionsTruncatedCount');
    expect(store.getState().detail.stepExecutionsTotal).toBe(0);
  });

  it('should refetch the first page of steps on later polls', async () => {
    const previousSteps = [{ id: 's1', stepId: 's1', status: ExecutionStatus.COMPLETED }];
    store.dispatch(
      setExecution({
        ...mockExecution,
        status: ExecutionStatus.RUNNING,
        stepExecutions: previousSteps as WorkflowExecutionDto['stepExecutions'],
      })
    );
    const nextSteps = [
      ...previousSteps,
      { id: 's2', stepId: 's2', status: ExecutionStatus.RUNNING },
    ];
    mockGetExecution.mockResolvedValue({ ...mockExecution, status: ExecutionStatus.RUNNING });
    mockGetExecutionSteps.mockResolvedValue({
      results: nextSteps,
      total: 2,
      page: 1,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 1,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    expect(result.payload).toMatchObject({
      execution: { stepExecutions: nextSteps },
    });
  });

  const loadedStep = { id: 's1', stepId: 's1', status: ExecutionStatus.COMPLETED };
  const loadedPage = [loadedStep] as WorkflowExecutionDto['stepExecutions'];

  it('should refetch every loaded page while the run is still in flight', async () => {
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    store.dispatch(setStepExecutionPages([loadedPage, loadedPage]));
    mockGetExecution.mockResolvedValue({ ...mockExecution, status: ExecutionStatus.RUNNING });

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(2);
    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 1,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 2,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
  });

  it('should keep the loaded pages of a finished run without refetching them', async () => {
    store.dispatch(setExecution({ ...mockExecution }));
    store.dispatch(setStepExecutionPages([loadedPage, loadedPage]));
    mockGetExecution.mockResolvedValue(mockExecution);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).not.toHaveBeenCalled();
    expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
    expect(result.payload).toMatchObject({
      execution: { stepExecutions: [loadedStep, loadedStep] },
    });
  });

  it('should start from the first page when the execution id changes', async () => {
    store.dispatch(setExecution({ ...mockExecution, id: 'exec-0' }));
    store.dispatch(setStepExecutionPages([loadedPage, loadedPage, loadedPage]));
    mockGetExecution.mockResolvedValue(mockExecution);

    await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
    expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-1', {
      page: 1,
      size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
    });
    expect(store.getState().detail.stepExecutionPages).toHaveLength(1);
  });

  it('should keep loaded data when a request is aborted', async () => {
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    store.dispatch(setStepExecutionPages([loadedPage]));
    const response = Promise.withResolvers<WorkflowExecutionDto>();
    mockGetExecution.mockReturnValue(response.promise);

    const request = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
    request.abort();
    await request;
    response.resolve(mockExecution);
    await Promise.resolve();

    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.RUNNING);
    expect(store.getState().detail.stepExecutionPages).toEqual([loadedPage]);
    expect(store.getState().detail.executionError).toBeUndefined();
  });

  it('should not toast when an aborted request subsequently fails', async () => {
    const response = Promise.withResolvers<WorkflowExecutionDto>();
    mockGetExecution.mockReturnValue(response.promise);
    const request = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
    request.abort();
    await request;
    response.reject(new Error('Request failed after cancellation'));
    await Promise.resolve();

    expect(mockServices.notifications.toasts.addError).not.toHaveBeenCalled();
    expect(store.getState().detail.executionError).toBeUndefined();
  });

  it('should wait for every loaded page before publishing a terminal execution', async () => {
    const secondPage = Promise.withResolvers<typeof mockStepsPage>();
    const secondPageStarted = Promise.withResolvers<void>();
    store.dispatch(setExecution({ ...mockExecution, status: ExecutionStatus.RUNNING }));
    store.dispatch(setStepExecutionPages([loadedPage, loadedPage]));
    mockGetExecution.mockResolvedValue(mockExecution);
    mockGetExecutionSteps.mockImplementation(async (_id: string, { page }: { page: number }) => {
      if (page === 2) {
        secondPageStarted.resolve();
        return secondPage.promise;
      }
      return { ...mockStepsPage, results: loadedPage };
    });

    const request = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
    await secondPageStarted.promise;
    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.RUNNING);
    secondPage.resolve({ ...mockStepsPage, results: loadedPage });
    await request;

    expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.COMPLETED);
    expect(store.getState().detail.stepExecutionPages).toEqual([loadedPage, loadedPage]);
  });

  it('should handle HTTP error with body message', async () => {
    const error = {
      body: { message: 'Execution not found' },
      message: 'Not Found',
    };

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith('Execution not found', {
      title: 'Failed to load execution',
    });
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Execution not found');
  });

  it('should handle HTTP error without body message', async () => {
    const error = {
      message: 'Network Error',
    };

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith('Network Error', {
      title: 'Failed to load execution',
    });
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Network Error');
  });

  it('should handle error without message', async () => {
    const error = {};

    mockGetExecution.mockRejectedValue(error);

    const result = await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

    expect(mockServices.notifications.toasts.addError).toHaveBeenCalledWith(
      'Failed to load execution',
      {
        title: 'Failed to load execution',
      }
    );
    expect(result.type).toBe('detail/loadExecutionThunk/rejected');
    expect(result.payload).toBe('Failed to load execution');
  });

  describe('request ordering', () => {
    it('keeps the newly selected execution when an older request resolves last', async () => {
      const firstResponse = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution.mockReturnValueOnce(firstResponse.promise).mockResolvedValueOnce({
        ...mockExecution,
        id: 'exec-b',
      });

      const firstRequest = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      await store.dispatch(loadExecutionThunk({ id: 'exec-b' }));
      firstResponse.resolve(mockExecution);
      await firstRequest;

      expect(store.getState().detail.execution?.id).toBe('exec-b');
    });

    it('ignores an older request after switching A to B and back to A', async () => {
      const firstResponse = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution
        .mockReturnValueOnce(firstResponse.promise)
        .mockResolvedValueOnce({ ...mockExecution, id: 'exec-b' })
        .mockResolvedValueOnce(mockExecution);

      const firstRequest = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      await store.dispatch(loadExecutionThunk({ id: 'exec-b' }));
      await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      firstResponse.resolve({ ...mockExecution, status: ExecutionStatus.RUNNING });
      await firstRequest;

      expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.COMPLETED);
    });

    it('does not toast a superseded failure', async () => {
      const firstResponse = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution.mockReturnValueOnce(firstResponse.promise).mockResolvedValueOnce({
        ...mockExecution,
        id: 'exec-b',
      });

      const firstRequest = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      await store.dispatch(loadExecutionThunk({ id: 'exec-b' }));
      firstResponse.reject(new Error('Old request failed'));
      await firstRequest;

      expect(store.getState().detail.execution?.id).toBe('exec-b');
      expect(mockServices.notifications.toasts.addError).not.toHaveBeenCalled();
    });

    it('does not restore an execution after the selection was cleared', async () => {
      const response = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution.mockReturnValueOnce(response.promise);
      const request = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      store.dispatch(clearExecution());
      response.resolve(mockExecution);
      await request;

      expect(store.getState().detail.execution).toBeUndefined();
      expect(store.getState().detail.stepExecutionPages).toEqual([]);
      expect(store.getState().detail.computedExecution).toBeUndefined();
    });

    it('loads final step statuses when the execution finishes during the request', async () => {
      let finished = false;
      const runningRows = [{ ...loadedStep, status: ExecutionStatus.RUNNING }];
      mockGetExecution.mockImplementation(async () => {
        finished = true;
        return mockExecution;
      });
      mockGetExecutionSteps.mockImplementation(async () => ({
        ...mockStepsPage,
        results: finished ? loadedPage : runningRows,
        total: 1,
      }));

      await store.dispatch(loadExecutionThunk({ id: 'exec-1' }));

      expect(store.getState().detail.execution?.status).toBe(ExecutionStatus.COMPLETED);
      expect(store.getState().detail.execution?.stepExecutions).toEqual(loadedPage);
    });

    it('ignores a page response from the previous execution', async () => {
      const pageResponse = Promise.withResolvers<typeof mockStepsPage>();
      const pageStarted = Promise.withResolvers<void>();
      mockGetExecution.mockImplementation(async (id: string) => ({ ...mockExecution, id }));
      mockGetExecutionSteps
        .mockImplementationOnce(() => {
          pageStarted.resolve();
          return pageResponse.promise;
        })
        .mockResolvedValue(mockStepsPage);

      const request = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      await pageStarted.promise;
      await store.dispatch(loadExecutionThunk({ id: 'exec-b' }));
      pageResponse.resolve({ ...mockStepsPage, results: loadedPage });
      await request;

      expect(store.getState().detail.execution?.id).toBe('exec-b');
      expect(store.getState().detail.stepExecutionPages).toEqual([[]]);
    });

    it('does not overlap requests for the same execution', async () => {
      const response = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution.mockReturnValue(response.promise);
      const first = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      const second = store.dispatch(loadExecutionThunk({ id: 'exec-1' }));
      response.resolve(mockExecution);
      await Promise.all([first, second]);

      expect(mockGetExecution).toHaveBeenCalledTimes(1);
      expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
    });
  });
});
