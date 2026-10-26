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
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { WorkflowExecutionListFooter } from './workflow_execution_list_footer';
import { TestWrapper } from '../../../shared/test_utils';

describe('WorkflowExecutionListFooter', () => {
  const terminalExecution: WorkflowExecutionListItemDto = {
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
  };

  const runningExecution: WorkflowExecutionListItemDto = {
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
  };

  const defaultConfirm = jest.fn().mockResolvedValue(undefined);

  const renderFooter = (
    overrides: Partial<React.ComponentProps<typeof WorkflowExecutionListFooter>> = {}
  ) => {
    return render(
      <TestWrapper>
        <WorkflowExecutionListFooter
          loadedExecutions={overrides.loadedExecutions ?? [terminalExecution]}
          canCancel={overrides.canCancel ?? true}
          isCancelInProgress={overrides.isCancelInProgress ?? false}
          onConfirmCancel={overrides.onConfirmCancel ?? defaultConfirm}
        />
      </TestWrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hides the bulk-cancel footer when all loaded executions are terminal', () => {
    renderFooter({ loadedExecutions: [terminalExecution] });
    expect(screen.queryByTestId('workflowExecutionListFooter')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancelAllActiveExecutionsButton')).not.toBeInTheDocument();
  });

  it('disables the button when the user cannot cancel despite a non-terminal execution', () => {
    renderFooter({
      loadedExecutions: [runningExecution],
      canCancel: false,
    });
    const button = screen.getByTestId('cancelAllActiveExecutionsButton');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Cancel 1 active execution');
  });

  it('disables the button while cancel is in progress', () => {
    renderFooter({
      loadedExecutions: [runningExecution],
      isCancelInProgress: true,
    });
    expect(screen.getByTestId('cancelAllActiveExecutionsButton')).toBeDisabled();
  });

  it('opens the modal and closes on Cancel without calling the confirm handler', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderFooter({
      loadedExecutions: [runningExecution],
      onConfirmCancel: onConfirm,
    });

    fireEvent.click(screen.getByTestId('cancelAllActiveExecutionsButton'));
    const modal = await screen.findByTestId('cancelAllActiveExecutionsConfirmationModal');
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(
        screen.queryByTestId('cancelAllActiveExecutionsConfirmationModal')
      ).not.toBeInTheDocument();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirmCancel when the modal is confirmed', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderFooter({
      loadedExecutions: [runningExecution],
      onConfirmCancel: onConfirm,
    });

    fireEvent.click(screen.getByTestId('cancelAllActiveExecutionsButton'));
    const modal = await screen.findByTestId('cancelAllActiveExecutionsConfirmationModal');
    fireEvent.click(within(modal).getByRole('button', { name: 'Cancel all' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('shows the loaded non-terminal count in the modal title (plural when multiple)', async () => {
    const secondRunning: WorkflowExecutionListItemDto = {
      ...runningExecution,
      id: 'exec-running-2',
    };
    renderFooter({
      loadedExecutions: [runningExecution, secondRunning, terminalExecution],
    });

    const footerButton = screen.getByTestId('cancelAllActiveExecutionsButton');
    expect(footerButton).toHaveTextContent('Cancel 2 active executions');

    fireEvent.click(footerButton);
    const modal = await screen.findByTestId('cancelAllActiveExecutionsConfirmationModal');

    expect(modal).toHaveTextContent('2');
    expect(modal).toHaveTextContent('active executions');
  });
});
