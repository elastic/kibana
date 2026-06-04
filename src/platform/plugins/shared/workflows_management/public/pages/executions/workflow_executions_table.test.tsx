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
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

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
  });

  it('calls internal executions search API', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    jest.mocked(services.http.post).mockResolvedValue({
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

    expect(services.http.post).toHaveBeenCalledWith(
      '/internal/workflows/executions/_search',
      expect.objectContaining({
        version: '1',
        body: expect.any(String),
      })
    );

    const { body } = jest.mocked(services.http.post).mock.calls[0][1] as unknown as {
      body: string;
    };
    const requestBody = JSON.parse(body);
    expect(requestBody.from).toBe(0);
    expect(requestBody.size).toBe(25);
    expect(requestBody.trackTotalHits).toBe(true);
  });

  it('shows empty state when search returns no executions', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    jest.mocked(services.http.post).mockResolvedValue({
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

  it('shows a generic error prompt for non-index errors', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);

    jest.mocked(services.http.post).mockRejectedValue(new Error('cluster unavailable'));

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
