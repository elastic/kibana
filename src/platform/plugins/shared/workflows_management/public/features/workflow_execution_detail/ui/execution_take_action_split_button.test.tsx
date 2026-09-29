/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import {
  useRunWorkflow,
  useTestWorkflow,
  useWorkflowsApi,
  useWorkflowsCapabilities,
} from '@kbn/workflows-ui';
import { createMockWorkflowApi, createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockRunWorkflow = vi.fn();
const mockTestWorkflow = vi.fn();
const mockWorkflowApi = createMockWorkflowApi();

vi.mock('@kbn/workflows-ui', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/workflows-ui')),
      useRunWorkflow: vi.fn(),
      useTestWorkflow: vi.fn(),
      useWorkflowsApi: vi.fn(),
      useWorkflowsCapabilities: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/navigation/use_navigate_to_execution', () => {
      const mocked = {
      useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
    };
      return { ...mocked, default: mocked };
    });

describe('ExecutionTakeActionSplitButton', () => {
  const services = createStartServicesMock();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
    mockTestWorkflow.mockResolvedValue({ workflowExecutionId: 'new-test-exec' });
    mockWorkflowApi.cancelExecution.mockResolvedValue(undefined);
    vi.mocked(useRunWorkflow).mockReturnValue({
      mutateAsync: mockRunWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useRunWorkflow>);
    vi.mocked(useTestWorkflow).mockReturnValue({
      mutateAsync: mockTestWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useTestWorkflow>);
    vi
      .mocked(useWorkflowsApi)
      .mockReturnValue(mockWorkflowApi as unknown as ReturnType<typeof useWorkflowsApi>);
    vi.mocked(useWorkflowsCapabilities).mockReturnValue(createMockWorkflowsCapabilities());
    services.notifications.toasts.addSuccess = vi.fn();
    services.notifications.toasts.addError = vi.fn();
  });

  const renderButton = (overrides: Parameters<typeof createMockWorkflowExecutionDto>[0] = {}) =>
    render(
      <ExecutionTakeActionSplitButton execution={createMockWorkflowExecutionDto(overrides)} />,
      { wrapper: getTestProvider({ services }) }
    );

  const openTakeActionMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
  };

  it('re-runs a production execution through runWorkflow', async () => {
    renderButton({
      isTestRun: false,
      context: { inputs: { alertId: 'a-1' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockRunWorkflow).toHaveBeenCalledWith({
        id: 'wf-1',
        inputs: { alertId: 'a-1' },
      });
    });
    expect(mockTestWorkflow).not.toHaveBeenCalled();
  });

  it('re-runs a test execution through testWorkflow', async () => {
    renderButton({
      isTestRun: true,
      context: { inputs: { alertId: 'a-1' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockTestWorkflow).toHaveBeenCalledWith({
        workflowId: 'wf-1',
        inputs: { alertId: 'a-1' },
      });
    });
    expect(mockRunWorkflow).not.toHaveBeenCalled();
  });

  it('disables Re-run while a test re-run is pending', () => {
    vi.mocked(useTestWorkflow).mockReturnValue({
      mutateAsync: mockTestWorkflow,
      isLoading: true,
    } as unknown as ReturnType<typeof useTestWorkflow>);

    renderButton({ isTestRun: true });

    expect(screen.getByRole('button', { name: 'Re-run' })).toBeDisabled();
  });

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
