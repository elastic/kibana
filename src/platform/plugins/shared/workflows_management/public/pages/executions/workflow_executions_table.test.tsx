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
import { of, throwError } from 'rxjs';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
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

jest.mock('./workflow_executions_data_grid', () => ({
  WorkflowExecutionsDataGrid: () => <div data-test-subj="workflowExecutionsDataGridStub" />,
}));

describe('WorkflowExecutionsTable', () => {
  const defaultQuery = { query: '', language: 'kuery' as const };
  const defaultTimeRange = { from: 'now-24h', to: 'now' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(searchSourceInstanceMock.fetch$).mockReturnValue(
      of({
        rawResponse: {
          hits: {
            hits: [],
            total: { value: 0, relation: 'eq' },
          },
        },
      }) as unknown as ReturnType<typeof searchSourceInstanceMock.fetch$>
    );
  });

  it('queries with space scoping and step-run exclusion filters', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);

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

    const filterCalls = jest
      .mocked(searchSourceInstanceMock.setField)
      .mock.calls.filter(([field]) => field === 'filter');
    expect(filterCalls.length).toBeGreaterThan(0);

    const searchFilters = filterCalls[filterCalls.length - 1][1] as Array<{ query: unknown }>;
    expect(searchFilters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: {
            bool: {
              should: [
                { term: { spaceId: 'my-space' } },
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          },
        }),
        expect.objectContaining({
          query: {
            bool: {
              must_not: { exists: { field: 'stepId' } },
            },
          },
        }),
      ])
    );
  });

  it('waits for the completed search response', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);

    jest.mocked(searchSourceInstanceMock.fetch$).mockReturnValue(
      of(
        {
          isPartial: true,
          isRunning: true,
          rawResponse: {
            hits: {
              hits: [],
              total: { value: 0, relation: 'eq' },
            },
          },
        },
        {
          isPartial: false,
          isRunning: false,
          rawResponse: {
            hits: {
              hits: [
                {
                  _id: 'execution-1',
                  _index: '.workflows-executions',
                  _source: { id: 'execution-1' },
                },
              ],
              total: { value: 1, relation: 'eq' },
            },
          },
        }
      ) as unknown as ReturnType<typeof searchSourceInstanceMock.fetch$>
    );

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
      expect(screen.getByTestId('workflowExecutionsTable')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('workflowExecutionsTableEmpty')).not.toBeInTheDocument();
  });

  it('shows empty state when the executions index does not exist', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    const indexNotFoundError = {
      attributes: {
        error: { type: 'index_not_found_exception', reason: 'missing' },
      },
    };

    jest
      .mocked(searchSourceInstanceMock.fetch$)
      .mockReturnValue(throwError(() => indexNotFoundError));

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
      results: [
        {
          id: 'exec-1',
          spaceId: 'default',
          workflowId: 'wf-1',
          status: 'completed',
          isTestRun: false,
          startedAt: '2024-01-01T10:00:00Z',
          finishedAt: '2024-01-01T10:00:03Z',
          duration: 3000,
          error: null,
        },
      ],
      page: 1,
      size: 25,
      total: WORKFLOWS_EXECUTIONS_MAX_RESULT_WINDOW + 500,
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

    jest
      .mocked(searchSourceInstanceMock.fetch$)
      .mockReturnValue(throwError(() => new Error('cluster unavailable')));

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
