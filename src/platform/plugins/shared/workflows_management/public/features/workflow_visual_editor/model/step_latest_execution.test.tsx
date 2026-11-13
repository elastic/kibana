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
import { useLastRunOutput } from './use_last_run_output';
import { useStepOutputSamples } from './use_step_output_samples';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({ useWorkflowsApi: jest.fn() }));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

/**
 * The reference tree and the chip hover both ask for the newest run of a step, with its whole
 * output (which can be megabytes). Asking twice for the same thing is one request too many.
 */
describe('the newest run of a step, asked for by the reference tree and by the chip hover', () => {
  let queryClient: QueryClient;
  let getWorkflowStepExecutions: jest.Mock;

  beforeEach(() => {
    getWorkflowStepExecutions = jest.fn().mockResolvedValue({
      results: [
        {
          id: 'run',
          stepId: 'a',
          status: ExecutionStatus.COMPLETED,
          globalExecutionIndex: 0,
          output: { value: 'fresh' },
        },
      ],
    });
    mockUseWorkflowsApi.mockReturnValue({
      getExecution: jest.fn(),
      getWorkflowStepExecutions,
    } as unknown as ReturnType<typeof useWorkflowsApi>);
    queryClient = createTestQueryClient();
  });

  afterEach(() => queryClient.clear());

  const renderBoth = (workflowId = 'wf-1', stepName = 'a') =>
    renderHook(
      () => ({
        hover: useLastRunOutput(workflowId, stepName),
        tree: useStepOutputSamples({ workflowId, stepNames: [stepName], treeRuns: [] }),
      }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );

  it('both get the output', async () => {
    const { result } = renderBoth();
    await waitFor(() => {
      expect(result.current.hover.output).toEqual({ value: 'fresh' });
      expect(result.current.tree.byStep.a).toBeDefined();
    });
  });

  it('is fetched once for the two of them', async () => {
    const { result } = renderBoth();
    await waitFor(() => expect(result.current.hover.output).toEqual({ value: 'fresh' }));
    expect(getWorkflowStepExecutions).toHaveBeenCalledTimes(1);
  });

  it('asks for the newest run only, with its output', async () => {
    renderBoth('wf-9', 'a');
    await waitFor(() => expect(getWorkflowStepExecutions).toHaveBeenCalled());
    expect(getWorkflowStepExecutions).toHaveBeenCalledWith('wf-9', {
      stepId: 'a',
      size: 1,
      includeOutput: true,
    });
  });

  it('fetches again for another step', async () => {
    const first = renderBoth('wf-1', 'a');
    await waitFor(() => expect(first.result.current.hover.output).toBeDefined());
    renderBoth('wf-1', 'b');
    await waitFor(() => expect(getWorkflowStepExecutions).toHaveBeenCalledTimes(2));
  });
});
