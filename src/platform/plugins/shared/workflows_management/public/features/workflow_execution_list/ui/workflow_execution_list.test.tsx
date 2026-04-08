/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus, type WorkflowExecutionListDto } from '@kbn/workflows';
import { WorkflowExecutionList, type WorkflowExecutionListProps } from './workflow_execution_list';
import { TestWrapper } from '../../../shared/test_utils';

jest.mock('./workflow_execution_list_item', () => ({
  WorkflowExecutionListItem: ({
    status,
    onClick,
    selected,
  }: {
    status: string;
    onClick: () => void;
    selected: boolean;
  }) => (
    <div
      data-test-subj="workflowExecutionListItem"
      data-selected={selected}
      onClick={onClick}
      role="button"
      onKeyDown={() => {}}
      tabIndex={0}
    >
      {status}
    </div>
  ),
}));

jest.mock('./workflow_execution_list_filters', () => ({
  ExecutionListFilters: () => <div data-test-subj="executionListFilters">{'Filters'}</div>,
}));

describe('WorkflowExecutionList', () => {
  const defaultFilters = {
    statuses: [],
    executionTypes: [],
    executedBy: [],
  };

  const mockExecutions: WorkflowExecutionListDto = {
    results: [
      {
        id: 'exec-1',
        spaceId: 'default',
        status: ExecutionStatus.COMPLETED,
        isTestRun: false,
        startedAt: '2024-01-01T10:00:00Z',
        finishedAt: '2024-01-01T10:01:00Z',
        error: null,
        duration: 60000,
        workflowId: 'wf-1',
        workflowName: 'Test Workflow',
        executedBy: 'user1',
        triggeredBy: 'manual',
      },
      {
        id: 'exec-2',
        spaceId: 'default',
        status: ExecutionStatus.FAILED,
        isTestRun: true,
        startedAt: '2024-01-01T11:00:00Z',
        finishedAt: '2024-01-01T11:00:30Z',
        error: null,
        duration: 30000,
        workflowId: 'wf-1',
        workflowName: 'Test Workflow',
        executedBy: 'user2',
        triggeredBy: 'scheduled',
      },
    ],
    page: 1,
    size: 100,
    total: 2,
  };

  const defaultProps: WorkflowExecutionListProps = {
    executions: mockExecutions,
    filters: defaultFilters,
    onFiltersChange: jest.fn(),
    isInitialLoading: false,
    isLoadingMore: false,
    error: null,
    onExecutionClick: jest.fn(),
    selectedId: null,
    setPaginationObserver: jest.fn(),
    canCancel: true,
    isCancelInProgress: false,
    onConfirmCancel: jest.fn().mockResolvedValue(undefined),
  };

  const renderComponent = (overrides: Partial<WorkflowExecutionListProps> = {}) => {
    return render(
      <TestWrapper>
        <WorkflowExecutionList {...defaultProps} {...overrides} />
      </TestWrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the execution history title', () => {
    renderComponent();
    expect(screen.getByText('Execution history')).toBeInTheDocument();
  });

  it('renders the container with the data-test-subj attribute', () => {
    renderComponent();
    expect(screen.getByTestId('workflowExecutionList')).toBeInTheDocument();
  });

  describe('loading state', () => {
    it('shows loading spinner when isInitialLoading is true', () => {
      renderComponent({ isInitialLoading: true });
      expect(screen.getByText('Loading executions...')).toBeInTheDocument();
    });

    it('does not render execution items when loading', () => {
      renderComponent({ isInitialLoading: true });
      expect(screen.queryAllByTestId('workflowExecutionListItem')).toHaveLength(0);
    });
  });

  describe('error state', () => {
    it('shows error message when error is provided', () => {
      renderComponent({ error: new Error('Something went wrong') });
      expect(screen.getByText('Error loading workflow executions')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when executions is null', () => {
      renderComponent({ executions: null });
      expect(screen.getByText('No executions found')).toBeInTheDocument();
      expect(screen.getByText('Workflow has not been executed yet.')).toBeInTheDocument();
    });

    it('shows empty state when executions results are empty', () => {
      renderComponent({
        executions: { results: [], page: 1, size: 100, total: 0 },
      });
      expect(screen.getByText('No executions found')).toBeInTheDocument();
    });
  });

  describe('with execution data', () => {
    it('renders all execution items', () => {
      renderComponent();
      const items = screen.getAllByTestId('workflowExecutionListItem');
      expect(items).toHaveLength(2);
    });

    it('calls onExecutionClick when an execution item is clicked', () => {
      const onExecutionClick = jest.fn();
      renderComponent({ onExecutionClick });
      const items = screen.getAllByTestId('workflowExecutionListItem');
      fireEvent.click(items[0]);
      expect(onExecutionClick).toHaveBeenCalledWith('exec-1');
    });

    it('marks the selected execution item', () => {
      renderComponent({ selectedId: 'exec-1' });
      const items = screen.getAllByTestId('workflowExecutionListItem');
      expect(items[0]).toHaveAttribute('data-selected', 'true');
      expect(items[1]).toHaveAttribute('data-selected', 'false');
    });
  });

  describe('loading more indicator', () => {
    it('shows loading spinner when loading more items', () => {
      const { container } = renderComponent({ isLoadingMore: true });
      const items = screen.getAllByTestId('workflowExecutionListItem');
      expect(items).toHaveLength(2);
      expect(container.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
    });

    it('does not show loading more spinner when not loading more', () => {
      renderComponent({ isLoadingMore: false });
      const items = screen.getAllByTestId('workflowExecutionListItem');
      expect(items).toHaveLength(2);
    });
  });

  describe('filters', () => {
    it('renders the execution list filters', () => {
      renderComponent();
      expect(screen.getByTestId('executionListFilters')).toBeInTheDocument();
    });
  });

  describe('pagination observer', () => {
    it('calls setPaginationObserver for the last execution item', () => {
      const setPaginationObserver = jest.fn();
      renderComponent({ setPaginationObserver });
      expect(setPaginationObserver).toHaveBeenCalled();
    });
  });

  describe('footer cancel non-terminal', () => {
    it('hides footer cancel when all loaded executions are terminal', () => {
      renderComponent();
      expect(screen.queryByTestId('workflowExecutionListFooter')).not.toBeInTheDocument();
    });

    it('enables footer cancel when a non-terminal execution is loaded', () => {
      const withRunning: WorkflowExecutionListDto = {
        ...mockExecutions,
        results: [
          {
            id: 'exec-running',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            isTestRun: false,
            startedAt: '2024-01-01T12:00:00Z',
            finishedAt: '2024-01-01T12:00:00Z',
            error: null,
            duration: 1000,
            workflowId: 'wf-1',
            workflowName: 'Test Workflow',
            executedBy: 'user1',
            triggeredBy: 'manual',
          },
        ],
        total: 1,
      };
      renderComponent({ executions: withRunning });
      expect(screen.getByTestId('workflowExecutionListFooter')).toBeInTheDocument();
      expect(screen.getByTestId('cancelAllActiveExecutionsButton')).not.toBeDisabled();
    });

    it('opens confirm modal and calls onConfirmCancel when confirmed', async () => {
      const onConfirmCancel = jest.fn().mockResolvedValue(undefined);
      const withRunning: WorkflowExecutionListDto = {
        ...mockExecutions,
        results: [
          {
            id: 'exec-running',
            spaceId: 'default',
            status: ExecutionStatus.RUNNING,
            isTestRun: false,
            startedAt: '2024-01-01T12:00:00Z',
            finishedAt: '2024-01-01T12:00:00Z',
            error: null,
            duration: 1000,
            workflowId: 'wf-1',
            workflowName: 'Test Workflow',
            executedBy: 'user1',
            triggeredBy: 'manual',
          },
        ],
        total: 1,
      };
      renderComponent({ executions: withRunning, onConfirmCancel });
      fireEvent.click(screen.getByTestId('cancelAllActiveExecutionsButton'));
      const modal = await screen.findByTestId('cancelAllActiveExecutionsConfirmationModal');
      expect(modal).toBeInTheDocument();
      fireEvent.click(within(modal).getByRole('button', { name: 'Cancel all' }));
      await waitFor(() => expect(onConfirmCancel).toHaveBeenCalled());
    });
  });
});
