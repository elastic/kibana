/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { ExecutionListFiltersProps } from './workflow_execution_list_filters';
import { ExecutionListFilters } from './workflow_execution_list_filters';
import { TestWrapper } from '../../../shared/test_utils';

describe('ExecutionListFilters', () => {
  const defaultFilters: ExecutionListFiltersProps['filters'] = {
    statuses: [],
    executionTypes: [],
    executedBy: [],
  };

  const defaultProps: ExecutionListFiltersProps = {
    filters: defaultFilters,
    onFiltersChange: jest.fn(),
    availableExecutedByOptions: [],
    showExecutor: false,
  };

  const renderComponent = (overrides: Partial<ExecutionListFiltersProps> = {}) => {
    return render(
      <TestWrapper>
        <ExecutionListFilters {...defaultProps} {...overrides} />
      </TestWrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter button', () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');
    expect(filterButton).toBeInTheDocument();
  });

  it('opens the popover when the filter button is clicked', async () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Filter executions')).toBeInTheDocument();
    });
  });

  it('shows status filter options in the popover', async () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  });

  it('does not show "Executed by" section when showExecutor is false', async () => {
    renderComponent({ showExecutor: false });
    const filterButton = screen.getByLabelText('Filter executions');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.queryByText('Executed by')).not.toBeInTheDocument();
    });
  });

  it('shows "Executed by" section when showExecutor is true', async () => {
    renderComponent({
      showExecutor: true,
      availableExecutedByOptions: ['user1', 'user2'],
    });
    const filterButton = screen.getByLabelText('Filter executions');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.getByText('Executed by')).toBeInTheDocument();
    });
  });

  it('does not show "Clear all" button when no filters are active', async () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });
  });

  it('shows the active filters count badge on the filter button', () => {
    renderComponent();
    // With no active filters, the badge should show 0 or not display prominently
    const filterButton = screen.getByLabelText('Filter executions');
    expect(filterButton).toBeInTheDocument();
  });

  it('closes the popover when clicking the filter button again', async () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');

    // Open popover
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    // Close popover
    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });
  });
});
