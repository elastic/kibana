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
import { WorkflowExecutionsPage } from './executions_page';
import { EXECUTION_TABLE_DEFAULT_PAGE_SIZE } from './workflow_executions_page_constants';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

jest.mock('../../shared/ui/filter_controls', () => ({
  FilterControls: () => <div data-test-subj="filterControlsStub" />,
}));

jest.mock('./workflow_executions_data_grid', () => ({
  WorkflowExecutionsDataGrid: () => <div data-test-subj="workflowExecutionsDataGridStub" />,
}));

jest.mock('./workflow_execution_detail_flyout', () => ({
  WorkflowExecutionDetailFlyout: ({ executionId }: { executionId: string }) => (
    <div data-test-subj="workflowExecutionDetailFlyout">{executionId}</div>
  ),
}));

const mockSetSelectedExecution = jest.fn();
const mockUseWorkflowUrlState = jest.fn(() => ({
  selectedExecutionId: undefined as string | undefined,
  setSelectedExecution: mockSetSelectedExecution,
}));
jest.mock('../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

describe('WorkflowExecutionsPage', () => {
  const renderPage = () => {
    const services = createStartServicesMock();
    services.spaces.getActiveSpace = jest.fn().mockResolvedValue({ id: 'default' });
    const SearchBarStub = () => <div data-test-subj="searchBarStub" />;
    services.unifiedSearch.ui.SearchBar = SearchBarStub;
    jest.mocked(services.http.get).mockResolvedValue({
      results: [],
      page: 1,
      size: EXECUTION_TABLE_DEFAULT_PAGE_SIZE,
      total: 0,
    });

    render(<WorkflowExecutionsPage />, { wrapper: getTestProvider({ services }) });

    return services;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowUrlState.mockReturnValue({
      selectedExecutionId: undefined,
      setSelectedExecution: mockSetSelectedExecution,
    });
  });

  it('renders the executions page with search, filters, and table', async () => {
    renderPage();

    expect(screen.getByTestId('workflowExecutionsPage')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionsExperimentalBadge')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionsPageContent')).toBeInTheDocument();
    expect(
      screen.queryByText('Browse and filter workflow executions across your space.')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('searchBarStub')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsFilters')).toBeInTheDocument();
    });
    expect(screen.getByTestId('filterControlsStub')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsTableEmpty')).toBeInTheDocument();
    });
  });

  it('opens execution flyout when executionId is present in the URL', async () => {
    mockUseWorkflowUrlState.mockReturnValue({
      selectedExecutionId: 'exec-1',
      setSelectedExecution: mockSetSelectedExecution,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('workflowExecutionsPageContent')).toBeInTheDocument();
    });
    expect(screen.getByTestId('workflowExecutionDetailFlyout')).toHaveTextContent('exec-1');
    expect(mockSetSelectedExecution).not.toHaveBeenCalled();
  });
});
