/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import {
  useWorkflowExecutionsTrailingControlColumns,
  WorkflowExecutionActionsMenu,
} from './workflow_executions_table_actions';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockNavigateToApp = jest.fn();
const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canUpdateWorkflow: true,
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  };
});

const createExecution = (
  overrides: Partial<WorkflowExecutionListItemDto> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:00:03Z',
  duration: 3000,
  error: null,
  ...overrides,
});

const ActionsCellHarness = ({
  onReRunExecution,
  onViewAllExecutionsForWorkflow,
  execution,
}: {
  onReRunExecution?: (params: {
    workflowId: string;
    executionId?: string;
    context?: Record<string, unknown>;
  }) => void;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  execution: WorkflowExecutionListItemDto;
}) => {
  const trailingControlColumns = useWorkflowExecutionsTrailingControlColumns(
    [execution],
    onViewAllExecutionsForWorkflow,
    onReRunExecution
  );
  const RowCell = trailingControlColumns[0].rowCellRender;

  return (
    <RowCell
      isExpandable={false}
      isExpanded={false}
      rowIndex={0}
      colIndex={0}
      columnId="actions"
      isDetails={false}
      setCellProps={() => {}}
    />
  );
};

describe('workflow executions actions column', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({
      canExecuteWorkflow: true,
      canReadWorkflowExecution: true,
      canUpdateWorkflow: true,
    });
  });

  it('renders actions menu items when opened', () => {
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <ActionsCellHarness
        onViewAllExecutionsForWorkflow={jest.fn()}
        execution={createExecution({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionActionsButton'));

    expect(screen.getByTestId('workflowExecutionActionReRun')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionActionEditWorkflow')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionActionViewAllExecutions')).toBeInTheDocument();
  });

  it('navigates to workflow detail for edit workflow', () => {
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <ActionsCellHarness
        execution={createExecution({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionActionsButton'));
    fireEvent.click(screen.getByTestId('workflowExecutionActionEditWorkflow'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', { path: '/wf-1' });
  });

  it('applies workflowId filter for view all executions', () => {
    const onViewAllExecutionsForWorkflow = jest.fn();
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <ActionsCellHarness
        onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
        execution={createExecution({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionActionsButton'));
    fireEvent.click(screen.getByTestId('workflowExecutionActionViewAllExecutions'));

    expect(onViewAllExecutionsForWorkflow).toHaveBeenCalledWith('wf-1');
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });

  it('re-runs execution in place when onReRunExecution is provided', () => {
    const onReRunExecution = jest.fn();
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <ActionsCellHarness
        onReRunExecution={onReRunExecution}
        execution={createExecution({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
          context: { inputs: { foo: 'bar' } },
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionActionsButton'));
    fireEvent.click(screen.getByTestId('workflowExecutionActionReRun'));

    expect(onReRunExecution).toHaveBeenCalledWith({
      workflowId: 'wf-1',
      executionId: 'exec-1',
      context: { inputs: { foo: 'bar' } },
    });
    expect(mockNavigateToApp).not.toHaveBeenCalled();
  });

  it('renders take action menu in flyout footer variant', () => {
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <WorkflowExecutionActionsMenu
        actionContext={{ executionId: 'exec-1', workflowId: 'wf-1' }}
        onReRunExecution={jest.fn()}
        onViewAllExecutionsForWorkflow={jest.fn()}
        variant="takeAction"
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionTakeActionButton'));

    expect(screen.getByTestId('workflowExecutionActionReRun')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionActionEditWorkflow')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionActionViewAllExecutions')).toBeInTheDocument();
  });

  it('hides actions when user lacks all relevant privileges', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      canExecuteWorkflow: false,
      canReadWorkflowExecution: false,
      canUpdateWorkflow: false,
    });

    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    const { container } = render(
      <ActionsCellHarness
        execution={createExecution({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    expect(container).toBeEmptyDOMElement();
  });
});
