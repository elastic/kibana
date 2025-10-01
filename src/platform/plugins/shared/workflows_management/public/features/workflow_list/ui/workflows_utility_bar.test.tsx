/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListItemDto } from '@kbn/workflows';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useWorkflowBulkActions } from './use_workflow_bulk_actions';
import { WorkflowsUtilityBar } from './workflows_utility_bar';

// Mock the bulk actions hook
jest.mock('./use_workflow_bulk_actions');
const mockUseWorkflowBulkActions = useWorkflowBulkActions as jest.MockedFunction<
  typeof useWorkflowBulkActions
>;

describe('WorkflowsUtilityBar', () => {
  const mockDeselectWorkflows = jest.fn();
  const mockOnRefresh = jest.fn();

  const defaultProps = {
    totalWorkflows: 10,
    selectedWorkflows: [] as WorkflowListItemDto[],
    deselectWorkflows: mockDeselectWorkflows,
    onRefresh: mockOnRefresh,
    showStart: 1,
    showEnd: 5,
  };

  const mockBulkActions = {
    panels: [
      {
        id: 0,
        items: [
          {
            name: 'Delete',
            onClick: jest.fn(),
            'data-test-subj': 'workflows-bulk-action-delete',
            key: 'workflows-bulk-action-delete',
          },
        ],
        title: 'Actions',
      },
    ],
    modals: <div data-test-subj="mock-modals" />,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowBulkActions.mockReturnValue(mockBulkActions);
  });

  it('renders workflow count correctly', () => {
    render(<WorkflowsUtilityBar {...defaultProps} />);

    expect(screen.getByText('Showing 1-5 of 10 workflows')).toBeInTheDocument();
  });

  it('does not show bulk actions when no workflows are selected', () => {
    render(<WorkflowsUtilityBar {...defaultProps} />);

    expect(screen.queryByTestId('workflows-table-bulk-actions-button')).not.toBeInTheDocument();
  });

  it('shows bulk actions when workflows are selected', () => {
    const selectedWorkflows = [
      { id: '1', name: 'Test Workflow 1' },
      { id: '2', name: 'Test Workflow 2' },
    ] as WorkflowListItemDto[];

    render(<WorkflowsUtilityBar {...defaultProps} selectedWorkflows={selectedWorkflows} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByTestId('workflows-table-bulk-actions-button')).toBeInTheDocument();
  });

  it('opens bulk actions popover when button is clicked', async () => {
    const selectedWorkflows = [{ id: '1', name: 'Test Workflow 1' }] as WorkflowListItemDto[];

    render(<WorkflowsUtilityBar {...defaultProps} selectedWorkflows={selectedWorkflows} />);

    const bulkActionsButton = screen.getByTestId('workflows-table-bulk-actions-button');
    await userEvent.click(bulkActionsButton);

    expect(screen.getByTestId('workflows-table-bulk-actions-context-menu')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    render(<WorkflowsUtilityBar {...defaultProps} />);

    const refreshButton = screen.getByTestId('workflows-refresh-button');
    await userEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders modals from bulk actions hook', () => {
    render(<WorkflowsUtilityBar {...defaultProps} />);

    expect(screen.getByTestId('mock-modals')).toBeInTheDocument();
  });

  it('calls deselectWorkflows when clear selection button is clicked', async () => {
    const selectedWorkflows = [{ id: '1', name: 'Test Workflow 1' }] as WorkflowListItemDto[];

    render(<WorkflowsUtilityBar {...defaultProps} selectedWorkflows={selectedWorkflows} />);

    const clearSelectionButton = screen.getByTestId('workflows-clear-selection-button');
    await userEvent.click(clearSelectionButton);

    expect(mockDeselectWorkflows).toHaveBeenCalledTimes(1);
  });
});
