/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { of, throwError } from 'rxjs';
import { searchSourceInstanceMock } from '@kbn/data-plugin/common/search/search_source/mocks';
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

  it('shows empty state when the executions index does not exist', async () => {
    const services = createStartServicesMock();
    const dataView = createWorkflowExecutionsDataView(services.fieldFormats);
    const indexNotFoundError = new errors.ResponseError({
      statusCode: 404,
      body: { error: { type: 'index_not_found_exception', reason: 'missing' } },
    } as ConstructorParameters<typeof errors.ResponseError>[0]);

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
