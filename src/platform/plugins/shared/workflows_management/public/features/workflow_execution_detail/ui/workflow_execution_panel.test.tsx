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
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { WorkflowExecutionPanel } from './workflow_execution_panel';
import {
  WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
  WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
} from '../../../../common';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setExecution,
  setStepExecutionPages,
  setStepExecutionsTotal,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { loadExecutionThunk } from '../../../entities/workflows/store/workflow_detail/thunks/load_execution_thunk';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';

const mockNavigateToApp = jest.fn();
const mockGetExecutionSteps = jest.fn();
const mockGetExecution = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useWorkflowsCapabilities: jest.fn(),
  WorkflowApi: jest.fn().mockImplementation(() => ({
    getExecutionSteps: mockGetExecutionSteps,
    getExecution: mockGetExecution,
  })),
}));

// Mock child components
jest.mock('./cancel_execution_button', () => ({
  CancelExecutionButton: ({ executionId }: { executionId: string }) => (
    <div data-test-subj="cancel-execution-button">
      {'Cancel Execution'} {executionId}
    </div>
  ),
}));

jest.mock('./workflow_step_execution_tree', () => ({
  WorkflowStepExecutionTree: ({
    definition,
    execution,
    error,
    onStepExecutionClick,
    selectedId,
  }: {
    definition: WorkflowYaml | null;
    execution: WorkflowExecutionDto | null;
    error: Error | null;
    onStepExecutionClick: (stepExecutionId: string) => void;
    selectedId: string | null;
  }) => (
    <div data-test-subj="workflow-step-execution-tree">
      <div data-test-subj="tree-definition">{definition ? 'Has Definition' : 'No Definition'}</div>
      <div data-test-subj="tree-execution">
        {execution ? `Execution: ${execution.id}` : 'No Execution'}
      </div>
      <div data-test-subj="tree-error">{error ? `Error: ${error.message}` : 'No Error'}</div>
      <div data-test-subj="tree-selected-id">{selectedId || 'No Selection'}</div>
      <button
        type="button"
        data-test-subj="mock-step-click"
        onClick={() => onStepExecutionClick('step-123')}
      >
        {'Click Step'}
      </button>
    </div>
  ),
}));

describe('WorkflowExecutionPanel', () => {
  const mockExecution: WorkflowExecutionDto = {
    id: 'exec-123',
    isTestRun: false,
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    error: null,
    startedAt: '2024-01-01T10:00:00Z',
    finishedAt: '',
    workflowId: 'workflow-123',
    workflowName: 'Test Workflow',
    workflowDefinition: {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [],
      steps: [],
    },
    stepExecutions: [],
    duration: 5000,
    yaml: 'version: "1"\nname: Test Workflow',
  };

  const mockDefinition: WorkflowYaml = {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  };

  const defaultProps = {
    execution: mockExecution,
    definition: mockDefinition,
    error: null,
    onStepExecutionClick: jest.fn(),
    selectedId: null,
    showBackButton: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigateToApp.mockReset();
    mockGetExecutionSteps.mockReset();
    mockGetExecution.mockReset();
    mockGetExecution.mockResolvedValue(mockExecution);
    jest.mocked(useWorkflowsCapabilities).mockReturnValue(createMockWorkflowsCapabilities());
  });

  const renderComponent = (
    props = {},
    services = createStartServicesMock(),
    stepExecutionsTotal?: number
  ) => {
    services.application.navigateToApp = mockNavigateToApp;

    const store = createMockStore(services);
    if (stepExecutionsTotal !== undefined) {
      store.dispatch(setStepExecutionPages([[]]));
      store.dispatch(setStepExecutionsTotal(stepExecutionsTotal));
    }

    return render(<WorkflowExecutionPanel {...defaultProps} {...props} />, {
      wrapper: getTestProvider({ services, store }),
    });
  };

  describe('rendering', () => {
    it('should render the component with execution data', () => {
      renderComponent();
      expect(screen.getByTestId('workflow-step-execution-tree')).toBeInTheDocument();
    });

    it('should render with null execution', () => {
      renderComponent({ execution: null });
      expect(screen.getByText('No Execution')).toBeInTheDocument();
    });

    it('should render with null definition', () => {
      renderComponent({ definition: null });
      expect(screen.getByText('No Definition')).toBeInTheDocument();
    });

    it('should render with error', () => {
      const error = new Error('Test error');
      renderComponent({ error });
      expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    });

    it('should show a truncation warning with the omitted step count', () => {
      renderComponent(
        {
          execution: {
            ...mockExecution,
            stepExecutions: [
              {
                id: 'step-1',
                stepId: 'step-1',
                stepType: 'console',
                scopeStack: [],
                workflowRunId: 'exec-123',
                workflowId: 'workflow-123',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2024-01-01T10:00:00Z',
                topologicalIndex: 0,
                globalExecutionIndex: 0,
                stepExecutionIndex: 0,
              },
            ],
          },
        },
        createStartServicesMock(),
        WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 842
      );
      expect(
        screen.getByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).toBeInTheDocument();
      expect(screen.getByText(/842 step executions were not loaded/)).toBeInTheDocument();
    });

    it('should not show a truncation warning for mget gaps on a single page', () => {
      renderComponent(
        {
          execution: {
            ...mockExecution,
            stepExecutions: [
              {
                id: 'step-1',
                stepId: 'step-1',
                stepType: 'console',
                scopeStack: [],
                workflowRunId: 'exec-123',
                workflowId: 'workflow-123',
                status: ExecutionStatus.COMPLETED,
                startedAt: '2024-01-01T10:00:00Z',
                topologicalIndex: 0,
                globalExecutionIndex: 0,
                stepExecutionIndex: 0,
              },
            ],
          },
        },
        createStartServicesMock(),
        500
      );
      expect(
        screen.queryByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).not.toBeInTheDocument();
    });

    it('should not show a truncation warning when the step list is empty', () => {
      renderComponent({ execution: { ...mockExecution } }, createStartServicesMock(), 12);
      expect(
        screen.queryByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).not.toBeInTheDocument();
    });

    const loadedStep = {
      id: 'step-1',
      stepId: 'step-1',
      stepType: 'console',
      scopeStack: [],
      workflowRunId: 'exec-123',
      workflowId: 'workflow-123',
      status: ExecutionStatus.COMPLETED,
      startedAt: '2024-01-01T10:00:00Z',
      topologicalIndex: 0,
      globalExecutionIndex: 0,
      stepExecutionIndex: 0,
    };

    const renderWithLoadedPages = (
      pages: number,
      total: number,
      status = ExecutionStatus.COMPLETED
    ) => {
      const services = createStartServicesMock();
      services.application.navigateToApp = mockNavigateToApp;
      const store = createMockStore(services);
      store.dispatch(setExecution({ ...mockExecution, status, stepExecutions: [] }));
      store.dispatch(setStepExecutionPages(Array.from({ length: pages }, () => [loadedStep])));
      store.dispatch(setStepExecutionsTotal(total));
      const execution = store.getState().detail.execution;

      render(<WorkflowExecutionPanel {...defaultProps} execution={execution ?? null} />, {
        wrapper: getTestProvider({ services, store }),
      });
      return store;
    };

    it('should append the next page when Show more is clicked', async () => {
      const nextStep = { ...loadedStep, id: 'step-2', stepId: 'step-2' };
      mockGetExecutionSteps.mockResolvedValue({
        results: [nextStep],
        total: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 1,
        page: 2,
        size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
      });
      const store = renderWithLoadedPages(1, WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 1);

      fireEvent.click(screen.getByTestId('workflowExecutionShowMoreStepExecutionsButton'));

      expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-123', {
        page: 2,
        size: WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE,
      });
      await waitFor(() => {
        expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
      });
      expect(store.getState().detail.execution?.stepExecutions).toEqual([loadedStep, nextStep]);
    });

    it('should keep the loaded pages and the action when Show more fails', async () => {
      mockGetExecutionSteps.mockRejectedValue(new Error('boom'));
      const store = renderWithLoadedPages(1, WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 842);

      fireEvent.click(screen.getByTestId('workflowExecutionShowMoreStepExecutionsButton'));

      await waitFor(() => {
        expect(mockGetExecutionSteps).toHaveBeenCalledTimes(1);
      });
      expect(store.getState().detail.stepExecutionPages).toHaveLength(1);
      expect(screen.getByText(/842 step executions were not loaded/)).toBeInTheDocument();
      expect(
        screen.getByTestId('workflowExecutionShowMoreStepExecutionsButton')
      ).toBeInTheDocument();
    });

    it('disables Show more during polling and removes it after all pages arrive', async () => {
      const response = Promise.withResolvers<WorkflowExecutionDto>();
      mockGetExecution.mockReturnValueOnce(response.promise);
      mockGetExecutionSteps.mockResolvedValue({ results: [loadedStep], total: 5500 });
      const store = renderWithLoadedPages(1, 5500, ExecutionStatus.RUNNING);
      act(() => {
        void store.dispatch(loadExecutionThunk({ id: 'exec-123' }));
      });
      expect(screen.getByTestId('workflowExecutionShowMoreStepExecutionsButton')).toBeDisabled();
      await act(async () => {
        response.resolve(mockExecution);
      });
      expect(store.getState().detail.stepExecutionPages).toHaveLength(2);
      expect(
        screen.queryByTestId('workflowExecutionShowMoreStepExecutionsButton')
      ).not.toBeInTheDocument();
    });

    it('allows manual continuation after the automatic budget for modern runs', async () => {
      const store = renderWithLoadedPages(WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT, 10500);
      act(() => {
        store.dispatch(setExecution({ ...mockExecution, stepExecutionIds: ['step-1'] }));
      });
      mockGetExecutionSteps.mockResolvedValue({ results: [loadedStep], total: 10500 });

      fireEvent.click(screen.getByTestId('workflowExecutionShowMoreStepExecutionsButton'));

      await waitFor(() => {
        expect(store.getState().detail.stepExecutionPages).toHaveLength(3);
      });
      expect(mockGetExecutionSteps).toHaveBeenCalledWith('exec-123', { page: 3, size: 5000 });
      expect(
        screen.queryByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).not.toBeInTheDocument();
    });

    it('should hide Show more once the page ceiling is reached', () => {
      renderWithLoadedPages(
        WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT,
        WORKFLOW_EXECUTION_STEPS_MAX_PAGE_COUNT * WORKFLOW_EXECUTION_STEPS_UI_PAGE_SIZE + 500
      );

      expect(
        screen.getByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('workflowExecutionShowMoreStepExecutionsButton')
      ).not.toBeInTheDocument();
    });

    it('should not show a truncation warning when the page is complete', () => {
      renderComponent();
      expect(
        screen.queryByTestId('workflowExecutionStepExecutionsTruncatedCallout')
      ).not.toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('should show back button when showBackButton is true', () => {
      renderComponent({ showBackButton: true });
      const backLink = screen.getByLabelText('Back to executions');
      expect(backLink).toBeInTheDocument();
    });

    it('should not show back button when showBackButton is false', () => {
      renderComponent({ showBackButton: false });
      expect(screen.queryByLabelText('Back to executions')).not.toBeInTheDocument();
    });

    it('should call onClose when back button is clicked', () => {
      const onClose = jest.fn();
      renderComponent({ onClose });
      const backLink = screen.getByLabelText('Back to executions');
      fireEvent.click(backLink);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel button', () => {
    it('should show cancel button for cancelable status (RUNNING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.RUNNING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for cancelable status (WAITING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.WAITING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for WAITING_FOR_INPUT (it is a cancelable status)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.WAITING_FOR_INPUT },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should show cancel button for cancelable status (PENDING)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.PENDING },
      });
      expect(screen.getByTestId('cancel-execution-button')).toBeInTheDocument();
    });

    it('should not show cancel button for terminal status (COMPLETED)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });

    it('should not show cancel button for terminal status (FAILED)', () => {
      renderComponent({
        execution: { ...mockExecution, status: ExecutionStatus.FAILED },
      });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });

    it('should not show cancel button when finishedAt is set even if status were stale', () => {
      renderComponent({
        execution: {
          ...mockExecution,
          status: ExecutionStatus.RUNNING,
          finishedAt: '2025-08-05T20:01:00.000Z',
        },
      });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });

    it('should not show cancel button when execution is null', () => {
      renderComponent({ execution: null });
      expect(screen.queryByTestId('cancel-execution-button')).not.toBeInTheDocument();
    });
  });

  describe('done button', () => {
    it('should show done button when showBackButton is false and status is terminal', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      const doneButton = screen.getByLabelText('Done');
      expect(doneButton).toBeInTheDocument();
    });

    it('should show done button for FAILED status when showBackButton is false', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.FAILED },
      });
      const doneButton = screen.getByLabelText('Done');
      expect(doneButton).toBeInTheDocument();
    });

    it('should not show done button when showBackButton is true', () => {
      renderComponent({
        showBackButton: true,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should not show done button when status is not terminal', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.RUNNING },
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should not show done button when execution is null', () => {
      renderComponent({
        showBackButton: false,
        execution: null,
      });
      expect(screen.queryByLabelText('Done')).not.toBeInTheDocument();
    });

    it('should call onClose when done button is clicked', () => {
      const onClose = jest.fn();
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
        onClose,
      });
      const doneButton = screen.getByLabelText('Done');
      fireEvent.click(doneButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('step execution interaction', () => {
    it('should pass selectedId to WorkflowStepExecutionTree', () => {
      renderComponent({ selectedId: 'step-456' });
      expect(screen.getByText('step-456')).toBeInTheDocument();
    });

    it('should call onStepExecutionClick when step is clicked', () => {
      const onStepExecutionClick = jest.fn();
      renderComponent({ onStepExecutionClick });
      const stepButton = screen.getByTestId('mock-step-click');
      fireEvent.click(stepButton);
      expect(onStepExecutionClick).toHaveBeenCalledWith('step-123');
      expect(onStepExecutionClick).toHaveBeenCalledTimes(1);
    });

    it('should pass null selectedId when not provided', () => {
      renderComponent({ selectedId: null });
      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });
  });

  describe('replay button', () => {
    it('should show replay button when done button is visible', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.getByTestId('replayExecutionButton')).toBeInTheDocument();
    });

    it('should not show replay button when execution is still running', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.RUNNING },
      });
      expect(screen.queryByTestId('replayExecutionButton')).not.toBeInTheDocument();
    });

    it('should not show replay button when showBackButton is true', () => {
      renderComponent({
        showBackButton: true,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });
      expect(screen.queryByTestId('replayExecutionButton')).not.toBeInTheDocument();
    });

    it('should call onReRunExecution when provided', () => {
      const onReRunExecution = jest.fn();
      renderComponent({
        showBackButton: false,
        execution: {
          ...mockExecution,
          status: ExecutionStatus.COMPLETED,
          context: { inputs: { foo: 'bar' } },
        },
        onReRunExecution,
      });

      fireEvent.click(screen.getByTestId('replayExecutionButton'));

      expect(onReRunExecution).toHaveBeenCalledWith({
        workflowId: 'workflow-123',
        executionId: 'exec-123',
        context: { inputs: { foo: 'bar' } },
      });
      expect(mockNavigateToApp).not.toHaveBeenCalled();
    });

    it('should navigate to workflow detail with replay execution id on click', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });

      fireEvent.click(screen.getByTestId('replayExecutionButton'));

      expect(mockNavigateToApp).toHaveBeenCalledWith('workflows', {
        path: '/workflow-123?replayExecutionId=exec-123',
      });
    });

    it('should disable replay button when user lacks execute capability', () => {
      jest.mocked(useWorkflowsCapabilities).mockReturnValue({
        ...createMockWorkflowsCapabilities(),
        canExecuteWorkflow: false,
      });

      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });

      const replayButton = screen.getByTestId('replayExecutionButton');
      expect(replayButton).toBeDisabled();
    });

    it('should enable replay button when user can execute workflow', () => {
      renderComponent({
        showBackButton: false,
        execution: { ...mockExecution, status: ExecutionStatus.COMPLETED },
      });

      expect(screen.getByTestId('replayExecutionButton')).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('should handle all props being null/empty', () => {
      renderComponent({
        execution: null,
        definition: null,
        error: null,
        selectedId: null,
      });
      expect(screen.getByText('No Execution')).toBeInTheDocument();
      expect(screen.getByText('No Definition')).toBeInTheDocument();
      expect(screen.getByText('No Error')).toBeInTheDocument();
      expect(screen.getByText('No Selection')).toBeInTheDocument();
    });
  });
});
