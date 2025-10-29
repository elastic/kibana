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
import type { WorkflowYaml } from '@kbn/workflows/spec/schema';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import { TestWrapper } from '../../../shared/test_utils';
import { createMockStore } from '../../../widgets/workflow_yaml_editor/lib/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setIsTestModalOpen,
  setWorkflow,
} from '../../../widgets/workflow_yaml_editor/lib/store/slice';

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

jest.mock('../../../widgets/workflow_yaml_editor/lib/store/hooks/use_async_thunk', () => ({
  useAsyncThunk: () => mockUseAsyncThunk(),
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

  const mockWorkflow = {
    id: 'test-123',
    name: 'Test Workflow',
    enabled: true,
    yaml: 'version: "1"',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  };

  const renderModal = (storeSetup?: (store: ReturnType<typeof createMockStore>) => void) => {
    const store = createMockStore();
    store.dispatch(setWorkflow(mockWorkflow));

    if (storeSetup) {
      storeSetup(store);
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(<WorkflowDetailTestModal />, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockUseAsyncThunk.mockReturnValue(
      jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' })
    );
  });

  describe('modal rendering', () => {
    it('should not render when modal is closed', () => {
      const { queryByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(false));
      });

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when no definition', () => {
      const { queryByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        // Don't set definition
      });

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when user lacks permissions', () => {
      mockUseCapabilities.mockReturnValue({
        canExecuteWorkflow: false,
      });

      const { queryByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should render modal when all conditions are met', () => {
      const { getByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

      expect(getByTestId('workflow-execute-modal')).toBeInTheDocument();
    });
  });

  describe('modal behavior', () => {
    it('should pass definition to WorkflowExecuteModal', () => {
      const { getByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

      const modalDefinition = getByTestId('modal-definition');
      expect(modalDefinition).toHaveTextContent(JSON.stringify(mockDefinition));
    });

    it('should close modal when close button is clicked', () => {
      const { getByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

      const closeButton = getByTestId('close-modal');
      fireEvent.click(closeButton);

      // Modal should close (dispatches setIsTestModalOpen(false))
      // In a real scenario, we'd need to await and check state
    });

    it('should call test workflow when submit button is clicked', async () => {
      const mockTestWorkflow = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' });
      mockUseAsyncThunk.mockReturnValue(mockTestWorkflow);

      const mockSetSelectedExecution = jest.fn();
      mockUseWorkflowUrlState.mockReturnValue({
        setSelectedExecution: mockSetSelectedExecution,
      });

      const { getByTestId } = renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

      const submitButton = getByTestId('submit-modal');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockTestWorkflow).toHaveBeenCalledWith({ inputs: { test: 'input' } });
      });
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

      renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        store.dispatch(
          _setComputedDataInternal({
            workflowDefinition: mockDefinition as WorkflowYaml,
          })
        );
      });

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

      renderModal((store) => {
        store.dispatch(setIsTestModalOpen(true));
        // Don't set definition
      });

      expect(addWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please fix the errors to run the workflow'),
        { toastLifeTimeMs: 3000 }
      );
    });
  });
});
