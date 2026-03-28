/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus, type WorkflowExecutionListDto } from '@kbn/workflows';
import { WorkflowExecutionList } from './workflow_execution_list_stateful';
import { TestWrapper } from '../../../shared/test_utils';

const mockSetSelectedExecution = jest.fn();

jest.mock('../../../hooks/use_kibana');

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => ({
    selectedExecutionId: null,
    setSelectedExecution: mockSetSelectedExecution,
  }),
}));

const mockWorkflowExecutions: WorkflowExecutionListDto = {
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
    },
  ],
  page: 1,
  size: 100,
  total: 1,
};

const mockUseWorkflowExecutions = jest.fn();
jest.mock('../../../entities/workflows/model/use_workflow_executions', () => ({
  useWorkflowExecutions: (...args: unknown[]) => mockUseWorkflowExecutions(...args),
}));

// Mock the presentational component to keep tests focused on the stateful logic
jest.mock('./workflow_execution_list', () => ({
  WorkflowExecutionList: (props: Record<string, unknown>) => {
    const { executions, isInitialLoading, error, onExecutionClick } = props as {
      executions: { results: unknown[] } | null;
      isInitialLoading: boolean;
      error: Error | null;
      onExecutionClick: (id: string) => void;
    };
    return (
      <div data-test-subj="mockWorkflowExecutionList">
        <span data-test-subj="loading">{String(isInitialLoading)}</span>
        <span data-test-subj="error">{error ? error.message : 'null'}</span>
        <span data-test-subj="executionCount">{executions?.results.length ?? 0}</span>
        <button
          type="button"
          data-test-subj="clickExecution"
          onClick={() => onExecutionClick('exec-1')}
        >
          {'Click'}
        </button>
      </div>
    );
  },
}));

describe('WorkflowExecutionList (stateful)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowExecutions.mockReturnValue({
      data: mockWorkflowExecutions,
      isInitialLoading: false,
      isLoadingMore: false,
      error: null,
      setPaginationObserver: jest.fn(),
    });
  });

  const renderComponent = (workflowId: string | null = 'wf-1') => {
    return render(
      <TestWrapper>
        <WorkflowExecutionList workflowId={workflowId} />
      </TestWrapper>
    );
  };

  it('renders the presentational component', () => {
    renderComponent();
    expect(screen.getByTestId('mockWorkflowExecutionList')).toBeInTheDocument();
  });

  it('passes loading state from the hook', () => {
    mockUseWorkflowExecutions.mockReturnValue({
      data: null,
      isInitialLoading: true,
      isLoadingMore: false,
      error: null,
      setPaginationObserver: jest.fn(),
    });
    renderComponent();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('passes error state from the hook', () => {
    mockUseWorkflowExecutions.mockReturnValue({
      data: null,
      isInitialLoading: false,
      isLoadingMore: false,
      error: new Error('Network error'),
      setPaginationObserver: jest.fn(),
    });
    renderComponent();
    expect(screen.getByTestId('error').textContent).toBe('Network error');
  });

  it('passes execution data from the hook', () => {
    renderComponent();
    expect(screen.getByTestId('executionCount').textContent).toBe('1');
  });

  it('calls useWorkflowExecutions with the workflowId', () => {
    renderComponent('wf-123');
    expect(mockUseWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-123' }),
      expect.any(Object)
    );
  });

  it('calls setSelectedExecution when an execution is clicked', () => {
    renderComponent();
    screen.getByTestId('clickExecution').click();
    expect(mockSetSelectedExecution).toHaveBeenCalledWith('exec-1');
  });
});
