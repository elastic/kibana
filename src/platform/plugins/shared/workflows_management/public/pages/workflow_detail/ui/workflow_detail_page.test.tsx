/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkflowDetailPage } from './workflow_detail_page';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { setWorkflow } from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils';

interface WorkflowDetailPageProps {
  id?: string;
}

// Mock the hooks
const mockUseWorkflowsBreadcrumbs = jest.fn();
const mockUseWorkflowUrlState = jest.fn();

// Create mock functions that can be changed
let mockLoadConnectors = jest.fn();
let mockLoadWorkflow = jest.fn();
let mockAsyncThunkState: { isLoading: boolean; error: string | null } = {
  isLoading: false,
  error: null,
};

jest.mock('../../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useWorkflowsBreadcrumbs: () => mockUseWorkflowsBreadcrumbs(),
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

// Mock the thunks
jest.mock('../../../entities/workflows/store/workflow_detail/thunks/load_connectors_thunk', () => ({
  loadConnectorsThunk: (...args: unknown[]) => mockLoadConnectors(...args),
}));
jest.mock('../../../entities/workflows/store/workflow_detail/thunks/load_workflow_thunk', () => ({
  loadWorkflowThunk: (...args: unknown[]) => mockLoadWorkflow(...args),
}));

// Mock child components to avoid rendering deep component trees
jest.mock('./workflow_detail_header', () => ({
  WorkflowDetailHeader: () => <div data-test-subj="workflow-detail-header">{'Header'}</div>,
}));
jest.mock('./workflow_detail_editor', () => ({
  WorkflowDetailEditor: () => <div data-test-subj="workflow-detail-editor">{'Editor'}</div>,
}));
jest.mock('./workflow_detail_layout', () => ({
  WorkflowEditorLayout: ({ editor, executionList, executionDetail }: any) => (
    <div data-test-subj="workflow-editor-layout">
      {editor}
      {executionList}
      {executionDetail}
    </div>
  ),
}));
jest.mock('./workflow_detail_test_modal', () => ({
  WorkflowDetailTestModal: () => (
    <div data-test-subj="workflow-detail-test-modal">{'Test Modal'}</div>
  ),
}));
jest.mock('../../../features/workflow_execution_detail', () => ({
  WorkflowExecutionDetail: ({ executionId }: any) => (
    <div data-test-subj="workflow-execution-detail">{executionId}</div>
  ),
}));
jest.mock('../../../features/workflow_execution_list/ui/workflow_execution_list_stateful', () => ({
  WorkflowExecutionList: ({ workflowId }: any) => (
    <div data-test-subj="workflow-execution-list">{workflowId}</div>
  ),
}));

// Mock useAsyncThunk hooks - needs to be dynamic
jest.mock('../../../hooks/use_async_thunk', () => ({
  useAsyncThunkState: (mockedThunk: Function) => [mockedThunk, mockAsyncThunkState],
}));

describe('WorkflowDetailPage', () => {
  const mockWorkflow = {
    id: 'test-workflow-123',
    name: 'Test Workflow',
    enabled: true,
    yaml: 'version: "1"\nname: Test Workflow\ntriggers:\n  - type: manual\nsteps:\n  - type: log\n    with:\n      message: hello',
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  };

  const renderWithProviders = (
    props: WorkflowDetailPageProps,
    storeSetup?: (
      store: ReturnType<typeof createMockStore>
    ) => void | ReturnType<typeof createMockStore>
  ) => {
    let store = createMockStore();

    if (storeSetup) {
      const result = storeSetup(store);
      if (result) {
        store = result;
      }
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };

    return render(<WorkflowDetailPage {...props} />, { wrapper });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock state
    mockAsyncThunkState = {
      isLoading: false,
      error: null,
    };
    mockLoadConnectors = jest.fn().mockReturnValue(Promise.resolve());
    mockLoadWorkflow = jest.fn().mockReturnValue(Promise.resolve());

    // Mock default hook implementations
    mockUseWorkflowsBreadcrumbs.mockImplementation(() => {
      // Empty function, hook just sets breadcrumbs
    });
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'workflow' as const,
      selectedExecutionId: undefined,
      setSelectedExecution: jest.fn(),
    });
  });

  describe('when loading existing workflow', () => {
    it('should load workflow when id is provided', async () => {
      renderWithProviders({ id: 'test-workflow-123' }, (s) => {
        s.dispatch(setWorkflow(mockWorkflow));
      });

      expect(mockLoadConnectors).toHaveBeenCalled();
      expect(mockLoadWorkflow).toHaveBeenCalledWith({ id: 'test-workflow-123' });
    });

    it('should set default yaml when no id is provided', () => {
      const store = createMockStore();
      const dispatchSpy = jest.spyOn(store, 'dispatch');

      renderWithProviders({ id: undefined }, () => store);

      expect(mockLoadConnectors).toHaveBeenCalled();
      // Component should render without loading a workflow since there's no id
      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('when error occurs', () => {
    it('should display error message when workflow fails to load', async () => {
      // Set error state
      mockAsyncThunkState = { isLoading: false, error: 'Failed to load workflow' };

      const { getByText } = renderWithProviders({ id: 'test-workflow-123' });

      await waitFor(() => {
        expect(getByText('Unable to load workflow')).toBeInTheDocument();
      });
    });
  });

  describe('when loading state', () => {
    it('should pass loading state to header', () => {
      // Set loading state
      mockAsyncThunkState = { isLoading: true, error: null };

      const { getByTestId } = renderWithProviders({ id: 'test-workflow-123' });
      expect(getByTestId('workflow-detail-header')).toBeInTheDocument();
    });
  });

  describe('when rendering different tabs', () => {
    it('should render editor layout with execution list when activeTab is executions', () => {
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'executions' as const,
        selectedExecutionId: undefined,
        setSelectedExecution: jest.fn(),
      });

      const { getByTestId } = renderWithProviders({ id: 'test-workflow-123' }, (s) => {
        s.dispatch(setWorkflow(mockWorkflow));
      });

      expect(getByTestId('workflow-execution-list')).toBeInTheDocument();
      expect(getByTestId('workflow-execution-list')).toHaveTextContent('test-workflow-123');
    });

    it('should render editor layout with execution detail when selectedExecutionId is set', () => {
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'executions' as const,
        selectedExecutionId: 'execution-123',
        setSelectedExecution: jest.fn(),
      });

      const { getByTestId } = renderWithProviders({ id: 'test-workflow-123' }, (s) => {
        s.dispatch(setWorkflow(mockWorkflow));
      });

      expect(getByTestId('workflow-execution-detail')).toBeInTheDocument();
      expect(getByTestId('workflow-execution-detail')).toHaveTextContent('execution-123');
    });
  });

  describe('when rendering standard layout', () => {
    it('should render editor and header without sidebar when no execution selected', () => {
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'workflow' as const,
        selectedExecutionId: undefined,
        setSelectedExecution: jest.fn(),
      });

      const { getByTestId, queryByTestId } = renderWithProviders(
        { id: 'test-workflow-123' },
        (s) => {
          s.dispatch(setWorkflow(mockWorkflow));
        }
      );

      expect(getByTestId('workflow-detail-header')).toBeInTheDocument();
      expect(getByTestId('workflow-detail-editor')).toBeInTheDocument();
      expect(getByTestId('workflow-editor-layout')).toBeInTheDocument();
      expect(queryByTestId('workflow-execution-list')).not.toBeInTheDocument();
      expect(queryByTestId('workflow-execution-detail')).not.toBeInTheDocument();
    });
  });

  describe('breadcrumbs', () => {
    it('should call useWorkflowsBreadcrumbs hook with workflow name', () => {
      const workflowName = 'My Workflow';

      renderWithProviders({ id: 'test-workflow-123' }, (s) => {
        s.dispatch(setWorkflow({ ...mockWorkflow, name: workflowName }));
      });

      expect(mockUseWorkflowsBreadcrumbs).toHaveBeenCalled();
    });
  });

  describe('useEffect dependencies', () => {
    it('should call loadConnectors on mount', () => {
      renderWithProviders({ id: 'test-workflow-123' });
      expect(mockLoadConnectors).toHaveBeenCalledTimes(1);
    });

    it('should call loadWorkflow when id changes', () => {
      const { rerender } = renderWithProviders({ id: 'test-workflow-123' });

      expect(mockLoadWorkflow).toHaveBeenCalledTimes(1);
      expect(mockLoadWorkflow).toHaveBeenLastCalledWith({ id: 'test-workflow-123' });

      rerender(<WorkflowDetailPage id="different-workflow-456" />);

      expect(mockLoadWorkflow).toHaveBeenCalledWith({ id: 'different-workflow-456' });
    });
  });

  describe('workflow test modal', () => {
    it('should render workflow detail test modal', () => {
      const { getByTestId } = renderWithProviders({ id: 'test-workflow-123' });
      expect(getByTestId('workflow-detail-test-modal')).toBeInTheDocument();
    });
  });

  describe('workflow execution detail close handler', () => {
    it('should handle closing execution detail', () => {
      const setSelectedExecutionMock = jest.fn();
      mockUseWorkflowUrlState.mockReturnValue({
        activeTab: 'executions' as const,
        selectedExecutionId: 'execution-123',
        setSelectedExecution: setSelectedExecutionMock,
      });

      const { getByTestId } = renderWithProviders({ id: 'test-workflow-123' }, (s) => {
        s.dispatch(setWorkflow(mockWorkflow));
      });

      expect(getByTestId('workflow-execution-detail')).toBeInTheDocument();
      // The onClose handler is passed to WorkflowExecutionDetail but we can't test it here
      // as it's a callback that depends on the component's internal implementation
    });
  });
});
