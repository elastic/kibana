/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { ResumeExecutionButton } from './resume_execution_button';
import { mockWorkflowsManagementCapabilities } from '../../../hooks/__mocks__/use_workflows_capabilities';
import { TestWrapper } from '../../../shared/test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
}));

// Capture the onSubmit callback exposed by ResumeExecutionModal so tests can trigger it.
let capturedOnSubmit: ((params: { stepInputs: Record<string, unknown> }) => void) | undefined;

jest.mock('./resume_execution_modal', () => ({
  ResumeExecutionModal: ({
    onSubmit,
    onClose,
    resumeMessage,
  }: {
    onSubmit?: (params: { stepInputs: Record<string, unknown> }) => void;
    onClose: () => void;
    resumeMessage?: string;
  }) => {
    capturedOnSubmit = onSubmit;
    return (
      <div data-test-subj="resume-execution-modal">
        <span data-test-subj="modal-resume-message">{resumeMessage ?? ''}</span>
        <button type="button" data-test-subj="modal-close" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    );
  },
}));

const { useKibana } = jest.requireMock('@kbn/kibana-react-plugin/public');

describe('ResumeExecutionButton', () => {
  const mockHttpPost = jest.fn();
  const mockAddSuccess = jest.fn();
  const mockAddError = jest.fn();

  const defaultProps = {
    executionId: 'exec-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnSubmit = undefined;
    mockHttpPost.mockResolvedValue({});
    useKibana.mockReturnValue({
      services: {
        http: { post: mockHttpPost },
        notifications: {
          toasts: { addSuccess: mockAddSuccess, addError: mockAddError },
        },
      },
    });
    jest
      .mocked(useWorkflowsCapabilities)
      .mockReturnValue({ ...mockWorkflowsManagementCapabilities });
  });

  const renderComponent = (props = {}) =>
    render(
      <TestWrapper>
        <ResumeExecutionButton {...defaultProps} {...props} />
      </TestWrapper>
    );

  describe('callout', () => {
    it('renders the warning callout', () => {
      renderComponent();
      expect(screen.getByTestId('waitForInputCallout')).toBeInTheDocument();
    });

    it('renders the "Provide action" button', () => {
      renderComponent();
      expect(screen.getByTestId('provideActionButton')).toBeInTheDocument();
    });

    it('disables the button when user lacks executeWorkflow capability', () => {
      jest.mocked(useWorkflowsCapabilities).mockReturnValue({
        ...mockWorkflowsManagementCapabilities,
        canExecuteWorkflow: false,
      });
      renderComponent();
      expect(screen.getByTestId('provideActionButton')).toBeDisabled();
    });

    it('enables the button when user has executeWorkflow capability', () => {
      renderComponent();
      expect(screen.getByTestId('provideActionButton')).not.toBeDisabled();
    });
  });

  describe('modal', () => {
    it('modal is closed by default', () => {
      renderComponent();
      expect(screen.queryByTestId('resume-execution-modal')).not.toBeInTheDocument();
    });

    it('opens modal on "Provide action" click', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      expect(screen.getByTestId('resume-execution-modal')).toBeInTheDocument();
    });

    it('opens modal immediately when autoOpen=true', () => {
      renderComponent({ autoOpen: true });
      expect(screen.getByTestId('resume-execution-modal')).toBeInTheDocument();
    });

    it('closes modal when onClose is called', () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      expect(screen.getByTestId('resume-execution-modal')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('modal-close'));
      expect(screen.queryByTestId('resume-execution-modal')).not.toBeInTheDocument();
    });

    it('passes resumeMessage to modal', () => {
      renderComponent({ resumeMessage: 'Please approve this action' });
      fireEvent.click(screen.getByTestId('provideActionButton'));
      expect(screen.getByTestId('modal-resume-message')).toHaveTextContent(
        'Please approve this action'
      );
    });
  });

  describe('submit', () => {
    it('calls POST /api/workflowExecutions/{id}/resume with the submitted input', async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      await waitFor(() => expect(capturedOnSubmit).toBeDefined());
      act(() => {
        capturedOnSubmit!({ stepInputs: { approved: true } });
      });
      await waitFor(() => {
        expect(mockHttpPost).toHaveBeenCalledWith('/api/workflowExecutions/exec-123/resume', {
          body: JSON.stringify({ input: { approved: true } }),
        });
      });
    });

    it('shows success toast and closes modal on successful submit', async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      await waitFor(() => expect(capturedOnSubmit).toBeDefined());
      act(() => {
        capturedOnSubmit!({ stepInputs: {} });
      });
      await waitFor(() => {
        expect(mockAddSuccess).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('resume-execution-modal')).not.toBeInTheDocument();
      });
    });

    it('shows error toast and keeps modal open on failed submit', async () => {
      const apiError = new Error('Network error');
      mockHttpPost.mockRejectedValueOnce(apiError);
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      await waitFor(() => expect(capturedOnSubmit).toBeDefined());
      act(() => {
        capturedOnSubmit!({ stepInputs: {} });
      });
      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          apiError,
          expect.objectContaining({ title: expect.any(String) })
        );
        expect(screen.getByTestId('resume-execution-modal')).toBeInTheDocument();
      });
    });

    it('disables the button and shows loading while the request is in-flight', async () => {
      let resolvePost!: () => void;
      mockHttpPost.mockImplementationOnce(
        () => new Promise<void>((resolve) => (resolvePost = resolve))
      );

      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      await waitFor(() => expect(capturedOnSubmit).toBeDefined());
      act(() => {
        capturedOnSubmit!({ stepInputs: {} });
      });

      // Button should be disabled + loading while the POST is in flight
      await waitFor(() => {
        expect(screen.getByTestId('provideActionButton')).toBeDisabled();
      });

      // Resolve the POST — button stays disabled (isSubmitted) but stops loading
      resolvePost();
      await waitFor(() => {
        expect(screen.getByTestId('provideActionButton')).toBeDisabled();
      });
    });

    it('does not disable the button when submit fails', async () => {
      mockHttpPost.mockRejectedValueOnce(new Error('fail'));
      renderComponent();
      fireEvent.click(screen.getByTestId('provideActionButton'));
      await waitFor(() => expect(capturedOnSubmit).toBeDefined());
      act(() => {
        capturedOnSubmit!({ stepInputs: {} });
      });
      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledTimes(1);
        // Button must remain enabled so the user can retry
        expect(screen.getByTestId('provideActionButton')).not.toBeDisabled();
      });
    });
  });
});
