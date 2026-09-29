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
import { default as React } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { CancelExecutionButton } from './cancel_execution_button';
import { TestWrapper } from '../../../shared/test_utils';

const mockCancelExecution = vi.fn();

vi.mock('@kbn/workflows-ui', () => {
      const mocked = {
      useWorkflowsApi: () => ({
        cancelExecution: mockCancelExecution,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockReportWorkflowRunCancelled = vi.fn();

vi.mock('../../../hooks/use_telemetry', () => {
      const mocked = {
      useTelemetry: vi.fn(() => ({
        reportWorkflowRunCancelled: mockReportWorkflowRunCancelled,
      })),
    };
      return { ...mocked, default: mocked };
    });

const { useKibana } = (await vi.importMock('@kbn/kibana-react-plugin/public'));

describe('CancelExecutionButton', () => {
  const mockAddSuccess = vi.fn();
  const mockAddError = vi.fn();

  const defaultProps = {
    executionId: 'exec-123',
    workflowId: 'wf-456',
    startedAt: '2024-01-15T10:30:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('CancelExecutionButton authorization', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it.each([
      {
        label: 'cancel allowed',
        cancelWorkflowExecution: true,
        expectDisabled: false,
      },
      {
        label: 'cancel denied',
        cancelWorkflowExecution: false,
        expectDisabled: true,
      },
    ])('$label: button disabled=$expectDisabled', ({ cancelWorkflowExecution, expectDisabled }) => {
      useKibana.mockReturnValue({
        services: {
          application: {
            capabilities: {
              workflowsManagement: { cancelWorkflowExecution },
            },
          },
          notifications: { toasts: { addSuccess: vi.fn(), addError: vi.fn() } },
        },
      });

      render(
        <I18nProvider>
          <CancelExecutionButton
            executionId="exec-1"
            workflowId="wf-1"
            startedAt="2020-01-01T00:00:00Z"
          />
        </I18nProvider>
      );

      const button = screen.getByTestId('cancelExecutionButton');
      if (expectDisabled) {
        expect(button).toBeDisabled();
      } else {
        expect(button).not.toBeDisabled();
      }
    });
  });
});
