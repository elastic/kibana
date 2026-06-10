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
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { type EsWorkflowExecution, ExecutionStatus } from '@kbn/workflows';
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

const createRow = (source: Partial<EsWorkflowExecution>): DataTableRecord => ({
  id: source.id ?? 'exec-1',
  raw: {
    _id: source.id ?? 'exec-1',
    _source: source,
  } as EsHitRecord,
  flattened: {},
});

const ActionsCellHarness = ({
  onViewAllExecutionsForWorkflow,
  row,
}: {
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
  row: DataTableRecord;
}) => {
  const trailingControlColumns = useWorkflowExecutionsTrailingControlColumns(
    [row],
    onViewAllExecutionsForWorkflow
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
        row={createRow({
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
        row={createRow({
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
        row={createRow({
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

  it('navigates to workflow detail with replay execution id for re-run', () => {
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <ActionsCellHarness
        row={createRow({
          id: 'exec-1',
          workflowId: 'wf-1',
          status: ExecutionStatus.COMPLETED,
        })}
      />,
      { wrapper: getTestProvider({ services }) }
    );

    fireEvent.click(screen.getByTestId('workflowExecutionActionsButton'));
    fireEvent.click(screen.getByTestId('workflowExecutionActionReRun'));

    expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/wf-1?replayExecutionId=exec-1',
    });
  });

  it('renders take action menu in flyout footer variant', () => {
    const services = createStartServicesMock();
    services.application.navigateToApp = mockNavigateToApp;

    render(
      <WorkflowExecutionActionsMenu
        actionContext={{ executionId: 'exec-1', workflowId: 'wf-1' }}
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
        row={createRow({
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
