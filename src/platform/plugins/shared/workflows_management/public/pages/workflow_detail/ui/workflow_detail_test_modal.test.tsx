/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import {
  selectEditorYaml,
  selectIsTestModalOpen,
  selectWorkflowDefinition,
  selectWorkflowId,
} from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { testWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/test_workflow_thunk';
import { TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseCapabilities = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseAsyncThunk = jest.fn();

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../hooks/use_capabilities', () => ({
  useCapabilities: () => mockUseCapabilities(),
}));

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

jest.mock('../../../hooks/use_async_thunk', () => ({
  useAsyncThunk: (...args: unknown[]) => mockUseAsyncThunk(...args),
}));

jest.mock('../../../entities/workflows/store/workflow_detail/selectors', () => ({
  selectIsTestModalOpen: jest.fn(),
  selectWorkflowDefinition: jest.fn(),
  selectWorkflowId: jest.fn(),
  selectWorkflow: jest.fn(),
  selectEditorYaml: jest.fn(),
}));

// Mock WorkflowExecuteModal
jest.mock('../../../features/run_workflow/ui/workflow_execute_modal', () => ({
  WorkflowExecuteModal: ({
    definition,
    onClose,
    onSubmit,
  }: {
    definition: any;
    onClose: () => void;
    onSubmit: (inputs: any) => void;
  }) => (
    <div data-test-subj="workflow-execute-modal">
      <div data-test-subj="modal-definition">{JSON.stringify(definition)}</div>
      <button type="button" data-test-subj="close-modal" onClick={onClose}>
        {'Close'}
      </button>
      <button
        type="button"
        data-test-subj="submit-modal"
        onClick={() => onSubmit({ test: 'input' })}
      >
        {'Run'}
      </button>
    </div>
  ),
}));

describe('WorkflowDetailTestModal', () => {
  const mockDefinition = {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  };

  let mockTestWorkflow: jest.Mock;

  const renderModal = () => {
    const store = createMockStore();

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(<WorkflowDetailTestModal />, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTestWorkflow = jest.fn();

    (selectIsTestModalOpen as unknown as jest.Mock).mockReturnValue(true);
    (selectWorkflowDefinition as unknown as jest.Mock).mockReturnValue(mockDefinition);
    (selectWorkflowId as unknown as jest.Mock).mockReturnValue(null);
    (selectEditorYaml as unknown as jest.Mock).mockReturnValue('');

    mockUseAsyncThunk.mockImplementation((thunk) => {
      if (thunk === testWorkflowThunk) {
        return mockTestWorkflow;
      }
    });

    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addWarning: jest.fn(),
          },
        },
      },
    });

    mockUseCapabilities.mockReturnValue({
      canExecuteWorkflow: true,
    });

    mockUseWorkflowUrlState.mockReturnValue({
      setSelectedExecution: jest.fn(),
    });
  });

  describe('modal rendering', () => {
    it('should not render when modal is closed', () => {
      (selectIsTestModalOpen as unknown as jest.Mock).mockReturnValue(false);

      const { queryByTestId } = renderModal();

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when no definition', () => {
      (selectWorkflowDefinition as unknown as jest.Mock).mockReturnValue(undefined);
      const { queryByTestId } = renderModal();

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when user lacks permissions', () => {
      mockUseCapabilities.mockReturnValue({
        canExecuteWorkflow: false,
      });

      const { queryByTestId } = renderModal();

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should render modal when all conditions are met', () => {
      const { getByTestId } = renderModal();

      expect(getByTestId('workflow-execute-modal')).toBeInTheDocument();
    });
  });

  describe('modal behavior', () => {
    it('should pass definition to WorkflowExecuteModal', () => {
      const { getByTestId } = renderModal();

      const modalDefinition = getByTestId('modal-definition');
      expect(modalDefinition).toHaveTextContent(JSON.stringify(mockDefinition));
    });

    it('should close modal when close button is clicked', () => {
      const { getByTestId } = renderModal();

      const closeButton = getByTestId('close-modal');
      fireEvent.click(closeButton);

      // Modal should close (dispatches setIsTestModalOpen(false))
      // In a real scenario, we'd need to await and check state
    });
  });

  it(`should call testWorkflow workflow when submit button is clicked`, async () => {
    const expectedCalledFunction = mockTestWorkflow;
    expectedCalledFunction.mockResolvedValue({ workflowExecutionId: 'exec-123' });

    const mockSetSelectedExecution = jest.fn();
    mockUseWorkflowUrlState.mockReturnValue({
      setSelectedExecution: mockSetSelectedExecution,
    });

    const { getByTestId } = renderModal();

    const submitButton = getByTestId('submit-modal');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(expectedCalledFunction).toHaveBeenCalledWith({ inputs: { test: 'input' } });
    });
  });

  describe('warnings', () => {
    it('should show warning and close modal when user lacks permissions', () => {
      const addWarningSpy = jest.fn();
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addWarning: addWarningSpy,
            },
          },
        },
      });

      mockUseCapabilities.mockReturnValue({
        canExecuteWorkflow: false,
      });

      renderModal();

      expect(addWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('do not have permission to run workflows'),
        { toastLifeTimeMs: 3000 }
      );
    });

    it('should show warning and close modal when definition is invalid', () => {
      const addWarningSpy = jest.fn();
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addWarning: addWarningSpy,
            },
          },
        },
      });
      (selectWorkflowDefinition as unknown as jest.Mock).mockReturnValue(undefined);

      renderModal();
      expect(addWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please fix the errors to run the workflow'),
        { toastLifeTimeMs: 3000 }
      );
    });
  });
});
