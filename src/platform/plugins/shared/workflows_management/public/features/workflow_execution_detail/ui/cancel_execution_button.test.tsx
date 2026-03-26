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
import { CancelExecutionButton } from './cancel_execution_button';
import { TestWrapper } from '../../../shared/test_utils';

const mockCancelExecution = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({
    cancelExecution: mockCancelExecution,
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockReportWorkflowRunCancelled = jest.fn();

jest.mock('../../../hooks/use_telemetry', () => ({
  useTelemetry: jest.fn(() => ({
    reportWorkflowRunCancelled: mockReportWorkflowRunCancelled,
  })),
}));

const { useKibana } = jest.requireMock('@kbn/kibana-react-plugin/public');

describe('CancelExecutionButton', () => {
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  const defaultProps = {
    executionId: 'exec-123',
    workflowId: 'wf-456',
    startedAt: '2024-01-15T10:30:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelExecution.mockResolvedValue({});
    useKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
        },
        application: {
          capabilities: {
            workflowsManagement: {
              cancelWorkflowExecution: true,
            },
          },
        },
      },
    });
  });

  const renderComponent = (props = {}) =>
    render(
      <TestWrapper>
        <CancelExecutionButton {...defaultProps} {...props} />
      </TestWrapper>
    );

  it('renders the cancel execution button', () => {
    renderComponent();
    expect(screen.getByTestId('cancelExecutionButton')).toBeInTheDocument();
    expect(screen.getByTestId('cancelExecutionButton')).toHaveTextContent('Cancel execution');
  });

  it('disables the button when user lacks cancelWorkflowExecution capability', () => {
    useKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
        },
        application: {
          capabilities: {
            workflowsManagement: {
              cancelWorkflowExecution: false,
            },
          },
        },
      },
    });
    renderComponent();
    expect(screen.getByTestId('cancelExecutionButton')).toBeDisabled();
  });

  it('enables the button when user has cancelWorkflowExecution capability', () => {
    renderComponent();
    expect(screen.getByTestId('cancelExecutionButton')).not.toBeDisabled();
  });

  it('calls the cancel API and shows success toast on successful cancellation', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('cancelExecutionButton'));

    await waitFor(() => {
      expect(mockCancelExecution).toHaveBeenCalledWith('exec-123');
    });

    await waitFor(() => {
      expect(mockAddSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Execution cancelled' })
      );
    });
  });

  it('reports successful cancellation telemetry', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('cancelExecutionButton'));

    await waitFor(() => {
      expect(mockReportWorkflowRunCancelled).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowExecutionId: 'exec-123',
          workflowId: 'wf-456',
          origin: 'workflow_detail',
          error: undefined,
        })
      );
    });

    // Verify timeToCancellation is a number (computed from startedAt)
    const call = mockReportWorkflowRunCancelled.mock.calls[0][0];
    expect(typeof call.timeToCancellation).toBe('number');
  });

  it('shows error toast on failed cancellation', async () => {
    const apiError = new Error('Network error');
    mockCancelExecution.mockRejectedValueOnce(apiError);

    renderComponent();
    fireEvent.click(screen.getByTestId('cancelExecutionButton'));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        apiError,
        expect.objectContaining({ title: 'Error cancelling execution' })
      );
    });
  });

  it('reports failed cancellation telemetry with error', async () => {
    const apiError = new Error('Network error');
    mockCancelExecution.mockRejectedValueOnce(apiError);

    renderComponent();
    fireEvent.click(screen.getByTestId('cancelExecutionButton'));

    await waitFor(() => {
      expect(mockReportWorkflowRunCancelled).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowExecutionId: 'exec-123',
          workflowId: 'wf-456',
          origin: 'workflow_detail',
          error: apiError,
        })
      );
    });
  });

  it('computes timeToCancellation as undefined when startedAt is not provided', async () => {
    renderComponent({ startedAt: undefined });
    fireEvent.click(screen.getByTestId('cancelExecutionButton'));

    await waitFor(() => {
      expect(mockReportWorkflowRunCancelled).toHaveBeenCalledWith(
        expect.objectContaining({
          timeToCancellation: undefined,
        })
      );
    });
  });
});
