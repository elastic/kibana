/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { QueryClient } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useStepOutputSamples } from './use_step_output_samples';
import type { TreeRun } from '../../../entities/workflows/store/workflow_detail/types';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

const stepExecution = (overrides: Record<string, unknown> = {}) => ({
  id: 'step-exec',
  stepId: 'a',
  status: ExecutionStatus.COMPLETED,
  globalExecutionIndex: 0,
  output: { value: 'from-run' },
  ...overrides,
});

const execution = (
  stepExecutions: Array<ReturnType<typeof stepExecution>>,
  status = ExecutionStatus.COMPLETED
) => ({ id: 'exec', status, stepExecutions });

describe('useStepOutputSamples', () => {
  let queryClient: QueryClient;
  let mockGetExecution: jest.Mock;
  let mockGetWorkflowStepExecutions: jest.Mock;

  const renderSamples = ({
    workflowId,
    stepNames,
    treeRuns = [],
  }: {
    workflowId?: string;
    stepNames: string[];
    treeRuns?: TreeRun[];
  }) =>
    renderHook(() => useStepOutputSamples({ workflowId, stepNames, treeRuns }), {
      wrapper: createQueryClientWrapper(queryClient),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetExecution = jest.fn();
    mockGetWorkflowStepExecutions = jest
      .fn()
      .mockResolvedValue({ results: [stepExecution({ output: { value: 'from-history' } })] });
    mockUseWorkflowsApi.mockReturnValue({
      getExecution: mockGetExecution,
      getWorkflowStepExecutions: mockGetWorkflowStepExecutions,
    } as unknown as ReturnType<typeof useWorkflowsApi>);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("uses the step's newest run from the workflow history", async () => {
    const { result } = renderSamples({ workflowId: 'wf-1', stepNames: ['a'] });

    await waitFor(() => expect(result.current.byStep.a?.status).toBe('done'));

    expect(result.current.byStep.a.output).toEqual({ value: 'from-history' });
    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledWith('wf-1', {
      stepId: 'a',
      size: 1,
      includeOutput: true,
    });
  });

  it('has nothing to show without a saved workflow or any run', () => {
    const { result } = renderSamples({ stepNames: ['a'] });

    expect(result.current.byStep.a).toEqual({ status: 'none' });
    expect(mockGetWorkflowStepExecutions).not.toHaveBeenCalled();
  });

  it('prefers a run started from the tree over the history', async () => {
    mockGetExecution.mockResolvedValue(execution([stepExecution({ output: { value: 'fresh' } })]));

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'exec-1', stepId: 'a' }],
    });

    await waitFor(() => expect(result.current.byStep.a.output).toEqual({ value: 'fresh' }));
    expect(mockGetExecution).toHaveBeenCalledWith('exec-1', { includeOutput: true });
  });

  it('falls back to the history for steps a full run did not reach', async () => {
    mockGetExecution.mockResolvedValue(execution([stepExecution({ stepId: 'a' })]));

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a', 'b'],
      treeRuns: [{ executionId: 'full-run' }],
    });

    await waitFor(() => expect(result.current.byStep.a.output).toEqual({ value: 'from-run' }));
    await waitFor(() => expect(result.current.byStep.b.output).toEqual({ value: 'from-history' }));
  });

  it("ignores another step's single-step run", async () => {
    mockGetExecution.mockResolvedValue(execution([stepExecution({ stepId: 'b' })]));

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'run-b', stepId: 'b' }],
    });

    await waitFor(() => expect(mockGetExecution).toHaveBeenCalledWith('run-b', expect.anything()));
    await waitFor(() => expect(result.current.byStep.a.output).toEqual({ value: 'from-history' }));
  });

  it('shows the step as running while its own run has not loaded yet', () => {
    mockGetExecution.mockReturnValue(new Promise(() => {}));

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'exec-1', stepId: 'a' }],
    });

    expect(result.current.byStep.a).toEqual({ status: 'running' });
  });

  it('shows the step as running while its step execution is not finished', async () => {
    mockGetExecution.mockResolvedValue(
      execution(
        [stepExecution({ status: ExecutionStatus.RUNNING, output: undefined })],
        ExecutionStatus.RUNNING
      )
    );

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'exec-1', stepId: 'a' }],
    });

    await waitFor(() => expect(mockGetExecution).toHaveBeenCalled());
    await waitFor(() => expect(result.current.byStep.a.status).toBe('running'));
  });

  it('reports a failed step with its error message', async () => {
    mockGetExecution.mockResolvedValue(
      execution([
        stepExecution({
          status: ExecutionStatus.FAILED,
          output: undefined,
          error: { type: 'Error', message: 'boom' },
        }),
      ])
    );

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'exec-1', stepId: 'a' }],
    });

    await waitFor(() =>
      expect(result.current.byStep.a).toEqual({ status: 'error', errorMessage: 'boom' })
    );
  });

  it('uses the latest iteration of a step that ran several times', async () => {
    mockGetExecution.mockResolvedValue(
      execution([
        stepExecution({ globalExecutionIndex: 2, output: { value: 'last' } }),
        stepExecution({ globalExecutionIndex: 5, output: { value: 'newest' } }),
        stepExecution({ globalExecutionIndex: 3, output: { value: 'middle' } }),
      ])
    );

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'full-run' }],
    });

    await waitFor(() => expect(result.current.byStep.a.output).toEqual({ value: 'newest' }));
  });

  it('flags a full run as in progress until it reaches a terminal status', async () => {
    mockGetExecution.mockResolvedValueOnce(execution([], ExecutionStatus.RUNNING));

    const { result } = renderSamples({
      workflowId: 'wf-1',
      stepNames: [],
      treeRuns: [{ executionId: 'full-run' }],
    });

    expect(result.current.isFullRunInProgress).toBe(true);
    await waitFor(() => expect(mockGetExecution).toHaveBeenCalledTimes(1));
    expect(result.current.isFullRunInProgress).toBe(true);
  });

  it('does not flag a finished full run, nor single-step runs, as a full run in progress', async () => {
    mockGetExecution.mockResolvedValue(execution([], ExecutionStatus.COMPLETED));

    const finished = renderSamples({
      workflowId: 'wf-1',
      stepNames: [],
      treeRuns: [{ executionId: 'full-run' }],
    });
    await waitFor(() => expect(finished.result.current.isFullRunInProgress).toBe(false));

    mockGetExecution.mockReturnValue(new Promise(() => {}));
    const singleStep = renderSamples({
      workflowId: 'wf-1',
      stepNames: ['a'],
      treeRuns: [{ executionId: 'step-run', stepId: 'a' }],
    });
    expect(singleStep.result.current.isFullRunInProgress).toBe(false);
  });
});
