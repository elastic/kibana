/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { QueryClient } from '@kbn/react-query';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { LastRunWorkflowIdProvider } from './last_run_hint';
import { ReferenceChip } from './reference_chip';
import { createQueryClientWrapper, createTestQueryClient } from '../../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

const HINT = 'array · written as text';

describe('reference chip hover, last run', () => {
  let queryClient: QueryClient;
  let mockGetWorkflowStepExecutions: jest.Mock;

  const renderChip = ({
    expression = 'steps.search.output.hits.hits',
    workflowId,
  }: {
    expression?: string;
    workflowId?: string;
  } = {}) => {
    const Wrapper = createQueryClientWrapper(queryClient);
    return render(
      <I18nProvider>
        <Wrapper>
          <LastRunWorkflowIdProvider value={workflowId}>
            <ReferenceChip expression={expression} typeLabel="array" hint={HINT} />
          </LastRunWorkflowIdProvider>
        </Wrapper>
      </I18nProvider>
    );
  };

  const hover = () => {
    fireEvent.mouseOver(screen.getByRole('img', { name: /^Reference / }));
  };

  beforeEach(() => {
    mockGetWorkflowStepExecutions = jest.fn().mockResolvedValue({
      results: [
        {
          stepId: 'search',
          status: ExecutionStatus.COMPLETED,
          output: { hits: { hits: [{}, {}, {}], total: 3 } },
        },
      ],
    });
    mockUseWorkflowsApi.mockReturnValue({
      getWorkflowStepExecutions: mockGetWorkflowStepExecutions,
    } as unknown as ReturnType<typeof useWorkflowsApi>);
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("asks nothing until the chip is hovered, then adds the shape from the step's last run", async () => {
    renderChip({ workflowId: 'wf-1' });
    expect(mockGetWorkflowStepExecutions).not.toHaveBeenCalled();

    hover();

    expect(await screen.findByText('list, 3 items in the last run')).toBeInTheDocument();
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledTimes(1);
    expect(mockGetWorkflowStepExecutions).toHaveBeenCalledWith('wf-1', {
      stepId: 'search',
      size: 1,
      includeOutput: true,
    });
  });

  it('resolves the path after output against the last output', async () => {
    renderChip({ workflowId: 'wf-1', expression: 'steps.search.output.hits.total' });
    hover();
    expect(await screen.findByText('number in the last run')).toBeInTheDocument();
  });

  it.each([
    ['the step has not run', { results: [] }],
    [
      'its last run failed',
      { results: [{ status: ExecutionStatus.FAILED, output: { hits: { hits: [] } } }] },
    ],
    [
      'its last run is still going',
      { results: [{ status: ExecutionStatus.RUNNING, output: undefined }] },
    ],
  ])('keeps the declared hint alone when %s', async (_name, response) => {
    mockGetWorkflowStepExecutions.mockResolvedValue(response);
    renderChip({ workflowId: 'wf-1' });
    hover();

    await waitFor(() => expect(mockGetWorkflowStepExecutions).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.queryByText(/in the last run/)).not.toBeInTheDocument();
  });

  it('keeps the declared hint alone when the path is not in the last output', async () => {
    renderChip({ workflowId: 'wf-1', expression: 'steps.search.output.nope' });
    hover();

    await waitFor(() => expect(mockGetWorkflowStepExecutions).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.getByText(HINT)).toBeInTheDocument();
    expect(screen.queryByText(/in the last run/)).not.toBeInTheDocument();
  });

  it.each([
    ['not a step output', 'foreach.item'],
    ['a filtered expression', 'steps.search.output.hits | size'],
  ])('never asks for %s', async (_name, expression) => {
    renderChip({ workflowId: 'wf-1', expression });
    hover();

    expect(await screen.findByText(HINT)).toBeInTheDocument();
    expect(mockGetWorkflowStepExecutions).not.toHaveBeenCalled();
  });

  it('never asks when no workflow is provided', async () => {
    renderChip();
    hover();

    expect(await screen.findByText(HINT)).toBeInTheDocument();
    expect(mockGetWorkflowStepExecutions).not.toHaveBeenCalled();
  });
});
