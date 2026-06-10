/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { createWorkflowExecutionsDataView } from './workflow_executions_data_view';
import { WorkflowExecutionsTable } from './workflow_executions_table';
import { WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW } from '../../../common';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockSetSelectedExecution = jest.fn();
const mockUseWorkflowUrlState = jest.fn(() => ({
  selectedExecutionId: undefined as string | undefined,
  setSelectedExecution: mockSetSelectedExecution,
}));
jest.mock('../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

jest.mock('@kbn/unified-data-table', () => {
  const actual = jest.requireActual('@kbn/unified-data-table');
  return {
    ...actual,
    UnifiedDataTable: () => <div data-test-subj="unifiedDataTableStub" />,
  };
});

jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('WorkflowExecutionsTable', () => {
  const defaultQuery = { query: '', language: 'kuery' as const };
  const defaultTimeRange = { from: 'now-24h', to: 'now' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowUrlState.mockReturnValue({
      selectedExecutionId: undefined,
      setSelectedExecution: mockSetSelectedExecution,
    });
  });

  it('calls public executions search API', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    jest.mocked(services.http.get).mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0, relation: 'eq' },
      },
    });

    render(
      <WorkflowExecutionsTable
        dataView={dataView}
        filters={[]}
        query={defaultQuery}
        spaceId="my-space"
        timeRange={defaultTimeRange}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsTableEmpty')).toBeInTheDocument();
    });

    expect(services.http.get).toHaveBeenCalledWith(
      '/api/workflows/executions',
      expect.objectContaining({
        version: '2023-10-31',
        query: expect.objectContaining({
          from: 0,
          size: 25,
          trackTotalHits: true,
          query: expect.any(String),
          sort: expect.any(String),
        }),
      })
    );
  });

  it('shows empty state when search returns no executions', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    jest.mocked(services.http.get).mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0, relation: 'eq' },
      },
    });

    render(
      <WorkflowExecutionsTable
        dataView={dataView}
        filters={[]}
        query={defaultQuery}
        spaceId="default"
        timeRange={defaultTimeRange}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsTableEmpty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('workflowExecutionsTableError')).not.toBeInTheDocument();
  });

  it('shows a pagination limit callout when total exceeds the result window', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);

    jest.mocked(services.http.get).mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'exec-1',
            _source: {
              id: 'exec-1',
              workflowId: 'wf-1',
              status: 'completed',
              startedAt: '2024-01-01T10:00:00Z',
            },
          },
        ],
        total: { value: WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW + 500, relation: 'eq' },
      },
    });

    render(
      <WorkflowExecutionsTable
        dataView={dataView}
        filters={[]}
        query={defaultQuery}
        spaceId="default"
        timeRange={defaultTimeRange}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsTablePaginationLimit')).toBeInTheDocument();
    });

    expect(jest.mocked(services.http.get).mock.calls[0][1]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          from: 0,
          size: 25,
        }),
      })
    );
  });

  it('shows a generic error prompt for non-index errors', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);

    jest.mocked(services.http.get).mockRejectedValue(new Error('cluster unavailable'));

    render(
      <WorkflowExecutionsTable
        dataView={dataView}
        filters={[]}
        query={defaultQuery}
        spaceId="default"
        timeRange={defaultTimeRange}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsTableError')).toBeInTheDocument();
    });
    expect(screen.getByText('Failed to load executions')).toBeInTheDocument();
  });
});
