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
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
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

  const openPopover = async () => {
    fireEvent.click(screen.getByLabelText('Filter executions'));
    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the icon-only filter button', () => {
    renderComponent();
    expect(screen.getByLabelText('Filter executions')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionListFilterButton')).toBeInTheDocument();
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();
  });

  it('opens the popover when the filter button is clicked', async () => {
    renderComponent();
    await openPopover();
    expect(screen.getByText('Filter executions')).toBeInTheDocument();
  });

  it('shows status filter options in the popover', async () => {
    renderComponent();
    await openPopover();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows Run type options with Production and Test run labels', async () => {
    renderComponent();
    await openPopover();

    expect(screen.getByText('Run type')).toBeInTheDocument();
    expect(screen.getByText('Production')).toBeInTheDocument();
    expect(screen.getByText('Test run')).toBeInTheDocument();
    expect(screen.queryByText('Execution type')).not.toBeInTheDocument();
  });

  it('filters by production run type', async () => {
    const onFiltersChange = jest.fn();
    renderComponent({ onFiltersChange });
    await openPopover();

    fireEvent.click(screen.getByText('Production'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      statuses: [],
      executionTypes: [ExecutionType.PRODUCTION],
      executedBy: [],
    });
  });

  it('filters by execution name while keeping the other filters', async () => {
    const onFiltersChange = jest.fn();
    const filters = {
      statuses: [ExecutionStatus.COMPLETED],
      executionTypes: [ExecutionType.PRODUCTION],
      executedBy: ['user-1'],
    };
    renderComponent({ filters, onFiltersChange });
    await openPopover();

    fireEvent.change(screen.getByLabelText('Filter by execution name'), {
      target: { value: 'production' },
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, runName: 'production' });
  });

  it('keeps the execution name filter when status changes', async () => {
    const onFiltersChange = jest.fn();
    renderComponent({
      filters: { ...defaultFilters, runName: 'production' },
      onFiltersChange,
    });
    await openPopover();
    fireEvent.click(screen.getByText('Failed'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      statuses: [ExecutionStatus.FAILED],
      runName: 'production',
    });
  });

  it('counts the execution name filter and clears it with Clear all', async () => {
    const onFiltersChange = jest.fn();
    renderComponent({
      filters: { ...defaultFilters, runName: 'production' },
      onFiltersChange,
    });
    expect(screen.getByTestId('workflowExecutionListFilterCount')).toHaveTextContent('1');
    await openPopover();
    expect(screen.getByLabelText('Filter by execution name')).toHaveValue('production');
    fireEvent.click(screen.getByText('Clear all'));

    expect(onFiltersChange).toHaveBeenCalledWith({ ...defaultFilters, runName: undefined });
  });

  it('shows distinct labels for wait-related statuses', async () => {
    renderComponent();
    fireEvent.click(screen.getByLabelText('Filter executions'));

    await waitFor(() => {
      expect(screen.getByText('Waiting')).toBeInTheDocument();
      expect(screen.getByText('Waiting for input')).toBeInTheDocument();
      expect(screen.getByText('Waiting for child workflow')).toBeInTheDocument();
    });
  });

  it.each([
    ['Waiting', ExecutionStatus.WAITING],
    ['Waiting for input', ExecutionStatus.WAITING_FOR_INPUT],
    ['Waiting for child workflow', ExecutionStatus.WAITING_FOR_CHILD],
  ])('applies %s filter as %s', async (label, status) => {
    const onFiltersChange = jest.fn();
    renderComponent({ onFiltersChange });
    fireEvent.click(screen.getByLabelText('Filter executions'));
    fireEvent.click(await screen.findByText(label));

    expect(onFiltersChange).toHaveBeenCalledWith({
      statuses: [status],
      executionTypes: [],
      executedBy: [],
    });
  });

  it('does not show "Triggered by" section when showExecutor is false', async () => {
    renderComponent({ showExecutor: false });
    await openPopover();
    expect(screen.queryByText('Triggered by')).not.toBeInTheDocument();
  });

  it('shows "Triggered by" section when showExecutor is true', async () => {
    renderComponent({
      showExecutor: true,
      availableExecutedByOptions: [
        { label: 'user1', value: 'user1' },
        { label: 'user2', value: 'user2' },
      ],
    });
    await openPopover();
    expect(screen.getByText('Triggered by')).toBeInTheDocument();
  });

  it('filters by the profile UID behind a display label', async () => {
    const onFiltersChange = jest.fn();
    renderComponent({
      showExecutor: true,
      onFiltersChange,
      availableExecutedByOptions: [{ label: 'Tal Borenstein', value: 'u_tal' }],
    });
    await openPopover();
    fireEvent.click(screen.getByText('Tal Borenstein'));

    expect(onFiltersChange).toHaveBeenCalledWith({
      statuses: [],
      executionTypes: [],
      executedBy: ['u_tal'],
    });
  });

  it('allows filtering by an executor outside the loaded options', async () => {
    const onFiltersChange = jest.fn();
    renderComponent({ showExecutor: true, onFiltersChange });
    await openPopover();

    const input = screen.getByPlaceholderText('Filter by user');
    fireEvent.change(input, { target: { value: 'legacy-user' } });
    fireEvent.click(await screen.findByText('legacy-user'));

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith({
        statuses: [],
        executionTypes: [],
        executedBy: ['legacy-user'],
      });
    });
  });

  it('does not show "Clear all" button when no filters are active', async () => {
    renderComponent();
    await openPopover();
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('does not render a filter count badge when no filters are active', () => {
    renderComponent();
    expect(screen.queryByTestId('workflowExecutionListFilterCount')).not.toBeInTheDocument();
  });

  it('shows an accent count badge when filters are active', () => {
    renderComponent({
      filters: {
        statuses: [ExecutionStatus.FAILED],
        executionTypes: [],
        executedBy: [],
      },
    });
    const badge = screen.getByTestId('workflowExecutionListFilterCount');
    expect(badge).toHaveTextContent('1');
    expect(badge.className).toContain('accent');
  });

  it('closes the popover when clicking the filter button again', async () => {
    renderComponent();
    const filterButton = screen.getByLabelText('Filter executions');

    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    fireEvent.click(filterButton);
    await waitFor(() => {
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });
  });
});
