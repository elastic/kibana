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
import { ExecutionStatus } from '@kbn/workflows';
import { useRunWorkflow, useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowApi, createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockRunWorkflow = jest.fn();
const mockWorkflowApi = createMockWorkflowApi();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useRunWorkflow: jest.fn(),
  useWorkflowsApi: jest.fn(),
  useWorkflowsCapabilities: jest.fn(),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

describe('ExecutionTakeActionSplitButton', () => {
  const services = createStartServicesMock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
    mockWorkflowApi.cancelExecution.mockResolvedValue(undefined);
    jest.mocked(useRunWorkflow).mockReturnValue({
      mutateAsync: mockRunWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useRunWorkflow>);
    jest
      .mocked(useWorkflowsApi)
      .mockReturnValue(mockWorkflowApi as unknown as ReturnType<typeof useWorkflowsApi>);
    jest.mocked(useWorkflowsCapabilities).mockReturnValue(createMockWorkflowsCapabilities());
    services.notifications.toasts.addSuccess = jest.fn();
    services.notifications.toasts.addError = jest.fn();
  });

  const renderButton = (overrides: Parameters<typeof createMockWorkflowExecutionDto>[0] = {}) =>
    render(
      <ExecutionTakeActionSplitButton execution={createMockWorkflowExecutionDto(overrides)} />,
      { wrapper: getTestProvider({ services }) }
    );

  const openTakeActionMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
  };

  it('cancels a running execution from the take-action menu', async () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: undefined,
    });

    openTakeActionMenu();
    const cancelItem = screen.getByTestId('workflowExecutionFlyoutCancelExecution');
    expect(cancelItem).toBeEnabled();
    fireEvent.click(cancelItem);

    await waitFor(() => {
      expect(mockWorkflowApi.cancelExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  it('disables Cancel execution when finishedAt is set even if status is still RUNNING', () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: '2025-08-05T20:01:00.000Z',
    });

    openTakeActionMenu();
    expect(screen.getByTestId('workflowExecutionFlyoutCancelExecution')).toBeDisabled();
  });

  it('does not cancel a finished run if the disabled item is activated', () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: '2025-08-05T20:01:00.000Z',
    });

    openTakeActionMenu();
    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutCancelExecution'));
    expect(mockWorkflowApi.cancelExecution).not.toHaveBeenCalled();
  });

  it('disables Cancel execution when the run is terminal', () => {
    renderButton({
      status: ExecutionStatus.COMPLETED,
    });

    openTakeActionMenu();
    expect(screen.getByTestId('workflowExecutionFlyoutCancelExecution')).toBeDisabled();
  });

  it('does not cancel a terminal execution if the disabled item is activated', () => {
    renderButton({
      status: ExecutionStatus.FAILED,
    });

    openTakeActionMenu();
    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutCancelExecution'));
    expect(mockWorkflowApi.cancelExecution).not.toHaveBeenCalled();
  });
});
