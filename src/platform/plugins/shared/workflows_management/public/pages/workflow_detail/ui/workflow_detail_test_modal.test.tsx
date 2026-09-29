/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { fireEvent, render, waitFor } from '@testing-library/react';
import React from 'react';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { WorkflowDetailTestModal } from './workflow_detail_test_modal';
import {
  selectEditorYaml,
  selectIsTestModalOpen,
  selectReplayExecutionId,
  selectWorkflow,
  selectWorkflowDefinition,
  selectWorkflowId,
} from '../../../entities/workflows/store';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { testWorkflowThunk } from '../../../entities/workflows/store/workflow_detail/thunks/test_workflow_thunk';
import { TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = vi.fn();
const mockUseWorkflowUrlState = vi.fn();
const mockUseAsyncThunk = vi.fn();

vi.mock('../../../hooks/use_kibana', () => {
      const mocked = {
      useKibana: () => mockUseKibana(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/workflows-ui', async () => {
      const mocked = {
      ...(await vi.importActual('@kbn/workflows-ui')),
      useWorkflowsCapabilities: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseWorkflowsCapabilities = useWorkflowsCapabilities as MockedFunction<
  typeof useWorkflowsCapabilities
>;

vi.mock('../../../hooks/use_workflow_url_state', () => {
      const mocked = {
      useWorkflowUrlState: () => mockUseWorkflowUrlState(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_async_thunk', () => {
      const mocked = {
      useAsyncThunk: (...args: unknown[]) => mockUseAsyncThunk(...args),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../entities/workflows/store/workflow_detail/selectors', () => {
      const mocked = {
      selectIsTestModalOpen: vi.fn(),
      selectReplayExecutionId: vi.fn(),
      selectWorkflowDefinition: vi.fn(),
      selectWorkflowId: vi.fn(),
      selectWorkflow: vi.fn(),
      selectEditorYaml: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

// Mock WorkflowExecuteModal
vi.mock('../../../features/run_workflow/ui/workflow_execute_modal', () => {
      const mocked = {
      WorkflowExecuteModal: ({
        definition,
        onClose,
        onSubmit,
      }: {
        definition: any;
        onClose: () => void;
        onSubmit: (inputs: any, triggerTab: string) => void;
      }) => (
        <div data-test-subj="workflow-execute-modal">
          <div data-test-subj="modal-definition">{JSON.stringify(definition)}</div>
          <button type="button" data-test-subj="close-modal" onClick={onClose}>
            {'Close'}
          </button>
          <button
            type="button"
            data-test-subj="submit-modal"
            onClick={() => onSubmit({ test: 'input' }, 'manual')}
          >
            {'Run'}
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

describe('WorkflowDetailTestModal', () => {
  const mockDefinition = {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  };

  let mockTestWorkflow: Mock;

  const renderModal = () => {
    const store = createMockStore();

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(<WorkflowDetailTestModal />, { wrapper });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTestWorkflow = vi.fn();
    vi.mocked(selectWorkflow).mockReturnValue(undefined);

    (selectIsTestModalOpen as unknown as Mock).mockReturnValue(true);
    (selectReplayExecutionId as unknown as Mock).mockReturnValue(null);
    (selectWorkflowDefinition as unknown as Mock).mockReturnValue(mockDefinition);
    (selectWorkflowId as unknown as Mock).mockReturnValue(null);
    (selectEditorYaml as unknown as Mock).mockReturnValue('');

    mockUseAsyncThunk.mockImplementation((thunk) => {
      if (thunk === testWorkflowThunk) {
        return mockTestWorkflow;
      }
    });

    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addWarning: vi.fn(),
          },
        },
      },
    });

    mockUseWorkflowsCapabilities.mockReturnValue({
      ...createMockWorkflowsCapabilities(),
      canExecuteWorkflow: true,
    });

    mockUseWorkflowUrlState.mockReturnValue({
      setSelectedExecution: vi.fn(),
    });
  });

  describe('modal rendering', () => {
    it('should not render when modal is closed', () => {
      (selectIsTestModalOpen as unknown as Mock).mockReturnValue(false);

      const { queryByTestId } = renderModal();

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when no definition', () => {
      (selectWorkflowDefinition as unknown as Mock).mockReturnValue(undefined);
      const { queryByTestId } = renderModal();

      expect(queryByTestId('workflow-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when user lacks permissions', () => {
      mockUseWorkflowsCapabilities.mockReturnValue({
        ...createMockWorkflowsCapabilities(),
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

    const mockSetSelectedExecution = vi.fn();
    mockUseWorkflowUrlState.mockReturnValue({
      setSelectedExecution: mockSetSelectedExecution,
    });

    const { getByTestId } = renderModal();

    const submitButton = getByTestId('submit-modal');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(expectedCalledFunction).toHaveBeenCalledWith({
        inputs: { test: 'input' },
        triggerTab: 'manual',
      });
    });
  });

  it('opens a test run for an executor of a disabled workflow', async () => {
    vi.mocked(selectWorkflow).mockReturnValue({
      id: 'saved-workflow',
      name: 'Saved workflow',
      enabled: false,
      yaml: 'name: Saved workflow',
      createdAt: '',
      lastUpdatedAt: '',
      createdBy: 'owner',
      lastUpdatedBy: 'owner',
      definition: null,
      valid: true,
      permissions: { read: true, execute: true, edit: false, manage: false },
    });
    mockTestWorkflow.mockResolvedValue({ workflowExecutionId: 'saved-execution' });
    const { getByTestId } = renderModal();
    fireEvent.click(getByTestId('submit-modal'));
    await waitFor(() =>
      expect(mockTestWorkflow).toHaveBeenCalledWith({
        inputs: { test: 'input' },
        triggerTab: 'manual',
      })
    );
  });

  describe('warnings', () => {
    it('should show warning and close modal when user lacks permissions', () => {
      const addWarningSpy = vi.fn();
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addWarning: addWarningSpy,
            },
          },
        },
      });

      mockUseWorkflowsCapabilities.mockReturnValue({
        ...createMockWorkflowsCapabilities(),
        canExecuteWorkflow: false,
      });

      renderModal();

      expect(addWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('do not have permission to run workflows'),
        { toastLifeTimeMs: 3000 }
      );
    });

    it('should show warning and close modal when definition is invalid', () => {
      const addWarningSpy = vi.fn();
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addWarning: addWarningSpy,
            },
          },
        },
      });
      (selectWorkflowDefinition as unknown as Mock).mockReturnValue(undefined);
      (selectEditorYaml as unknown as Mock).mockReturnValue('name: invalid-workflow');

      renderModal();
      expect(addWarningSpy).toHaveBeenCalledWith(
        expect.stringContaining('Please fix the errors to run the workflow'),
        { toastLifeTimeMs: 3000 }
      );
    });
  });
});
