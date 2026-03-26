/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { WorkflowDetailTestStepModal } from './workflow_detail_test_step_modal';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  _setComputedDataInternal,
  setExecution,
  setReplayStepExecutionId,
  setTestStepModalOpenStepId,
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils';

// Mock hooks
const mockUseKibana = jest.fn();
const mockUseWorkflowUrlState = jest.fn();
const mockUseWorkflowActions = jest.fn();
const mockUseContextOverrideData = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => mockUseKibana(),
}));

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

jest.mock('../../../entities/workflows/model/use_workflow_actions', () => ({
  useWorkflowActions: () => mockUseWorkflowActions(),
}));

jest.mock('./use_context_override_data', () => ({
  useContextOverrideData: () => mockUseContextOverrideData,
}));

const StepExecuteModalMock = ({
  onSubmit,
  onClose,
  initialcontextOverride,
  initialStepExecutionId,
  initialWorkflowRunId,
  stepId,
  workflowGraph,
}: any) => (
  <div data-test-subj="step-execute-modal">
    <div data-test-subj="step-execute-modal-step-id">{stepId}</div>
    <div data-test-subj="step-execute-modal-initial-step-execution-id">
      {initialStepExecutionId || 'none'}
    </div>
    <div data-test-subj="step-execute-modal-initial-workflow-run-id">
      {initialWorkflowRunId || 'none'}
    </div>
    <div data-test-subj="step-execute-modal-context-override">
      {JSON.stringify(initialcontextOverride?.stepContext || {})}
    </div>
    <button
      data-test-subj="step-execute-modal-submit"
      onClick={() => onSubmit({ stepInputs: { test: 'value' } })}
      type="button"
    >
      {'Submit without executionContext'}
    </button>
    <button
      data-test-subj="step-execute-modal-submit-with-context"
      onClick={() =>
        onSubmit({
          stepInputs: { test: 'value' },
          executionContext: { inputs: { foo: 'bar' }, event: { type: 'test' } },
        })
      }
      type="button"
    >
      {'Submit with executionContext'}
    </button>
    <button data-test-subj="step-execute-modal-close" onClick={onClose} type="button">
      {'Close'}
    </button>
  </div>
);

jest.mock('../../../features/run_workflow/ui/step_execute_modal', () => ({
  StepExecuteModal: StepExecuteModalMock,
}));

describe('WorkflowDetailTestStepModal', () => {
  const mockContextOverride = {
    stepContext: { inputs: { key: 'value' } },
    schema: {} as any,
  };

  const mockWorkflowGraph = {
    getStepGraph: jest.fn((stepId: string) => ({ stepId, type: 'subgraph' })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        notifications: {
          toasts: {
            addError: jest.fn(),
          },
        },
      },
    });

    mockUseWorkflowUrlState.mockReturnValue({
      setSelectedExecution: jest.fn(),
    });

    mockUseWorkflowActions.mockReturnValue({
      runIndividualStep: {
        mutateAsync: jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' }),
      },
    });

    mockUseContextOverrideData.mockReturnValue(mockContextOverride);
  });

  const renderModal = (initialState?: {
    testStepModalOpenStepId?: string;
    replayStepExecutionId?: string | null;
    workflowId?: string;
    execution?: any;
    editorYaml?: string;
    workflowGraph?: any;
  }) => {
    const store = createMockStore();

    // Set up initial state
    if (initialState?.workflowId) {
      store.dispatch(
        setWorkflow({
          id: initialState.workflowId,
          name: 'Test Workflow',
          enabled: true,
        } as any)
      );
    }

    if (initialState?.testStepModalOpenStepId) {
      store.dispatch(setTestStepModalOpenStepId(initialState.testStepModalOpenStepId));
    }

    if (initialState?.replayStepExecutionId !== undefined) {
      store.dispatch(setReplayStepExecutionId(initialState.replayStepExecutionId));
    }

    if (initialState?.execution) {
      store.dispatch(setExecution(initialState.execution));
    }

    if (initialState?.editorYaml) {
      store.dispatch(setYamlString(initialState.editorYaml));
    }

    if (initialState?.workflowGraph) {
      store.dispatch(
        _setComputedDataInternal({
          workflowGraph: initialState.workflowGraph,
        } as any)
      );
    }

    const wrapper = ({ children }: { children: React.ReactNode }) => {
      return <TestWrapper store={store}>{children}</TestWrapper>;
    };
    return { ...render(<WorkflowDetailTestStepModal />, { wrapper }), store };
  };

  describe('rendering', () => {
    it('should render StepExecuteModal when testStepModalOpenStepId and contextOverride are present', () => {
      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      expect(getByTestId('step-execute-modal')).toBeInTheDocument();
      expect(getByTestId('step-execute-modal-step-id')).toHaveTextContent('test-step-id');
    });

    it('should not render when testStepModalOpenStepId is missing', () => {
      mockUseContextOverrideData.mockReturnValue(mockContextOverride);
      const { queryByTestId } = renderModal({
        workflowId: 'workflow-1',
      });
      expect(queryByTestId('step-execute-modal')).not.toBeInTheDocument();
    });

    it('should not render when contextOverride is null', () => {
      mockUseContextOverrideData.mockReturnValue(null);
      const { queryByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
      });
      expect(queryByTestId('step-execute-modal')).not.toBeInTheDocument();
    });

    it('should pass correct props to StepExecuteModal', () => {
      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      expect(getByTestId('step-execute-modal-step-id')).toHaveTextContent('test-step-id');
      expect(getByTestId('step-execute-modal-initial-step-execution-id')).toHaveTextContent('none');
      expect(getByTestId('step-execute-modal-initial-workflow-run-id')).toHaveTextContent(
        'execution-1'
      );
      expect(getByTestId('step-execute-modal-context-override')).toHaveTextContent(
        JSON.stringify(mockContextOverride.stepContext)
      );
    });

    it('should pass replayStepExecutionId when present', () => {
      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        replayStepExecutionId: 'replay-exec-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      expect(getByTestId('step-execute-modal-initial-step-execution-id')).toHaveTextContent(
        'replay-exec-1'
      );
    });
  });

  describe('submitStepRun', () => {
    it('should call runIndividualStep.mutateAsync with stepInputs when executionContext is not provided', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' });
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });

      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const submitButton = getByTestId('step-execute-modal-submit');

      await act(async () => {
        submitButton.click();
      });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workflowId: 'workflow-1',
          stepId: 'test-step-id',
          workflowYaml: 'name: Test Workflow\nsteps: []',
          contextOverride: { test: 'value' },
        });
      });
    });

    it('should call runIndividualStep.mutateAsync with stepInputs and executionContext when provided', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' });
      const mockSetSelectedExecution = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });
      mockUseWorkflowUrlState.mockReturnValue({
        setSelectedExecution: mockSetSelectedExecution,
      });

      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const submitButton = getByTestId('step-execute-modal-submit-with-context');

      await act(async () => {
        submitButton.click();
      });

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          workflowId: 'workflow-1',
          stepId: 'test-step-id',
          workflowYaml: 'name: Test Workflow\nsteps: []',
          contextOverride: { test: 'value' },
          executionContext: { inputs: { foo: 'bar' }, event: { type: 'test' } },
        });
      });
    });

    it('should set selected execution and close modal on successful submit', async () => {
      const mockMutateAsync = jest.fn().mockResolvedValue({ workflowExecutionId: 'exec-123' });
      const mockSetSelectedExecution = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });
      mockUseWorkflowUrlState.mockReturnValue({
        setSelectedExecution: mockSetSelectedExecution,
      });

      const { getByTestId, store } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const submitButton = getByTestId('step-execute-modal-submit');

      await act(async () => {
        submitButton.click();
      });

      await waitFor(() => {
        expect(mockSetSelectedExecution).toHaveBeenCalledWith('exec-123');
        expect(store.getState().detail.testStepModalOpenStepId).toBeUndefined();
        expect(store.getState().detail.replay?.stepExecutionId).toBeUndefined();
      });
    });

    it('should handle errors and show toast notification', async () => {
      const mockMutateAsync = jest.fn().mockRejectedValue(new Error('Failed to run step'));
      const mockAddError = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addError: mockAddError,
            },
          },
        },
      });

      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const submitButton = getByTestId('step-execute-modal-submit');

      await act(async () => {
        submitButton.click();
      });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          new Error('Failed to run step'),
          expect.objectContaining({
            title: expect.any(String),
          })
        );
      });
    });

    it('should handle errors with body.message and show toast notification', async () => {
      const errorWithBody = {
        body: { message: 'Custom error message' },
      };
      const mockMutateAsync = jest.fn().mockRejectedValue(errorWithBody);
      const mockAddError = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });
      mockUseKibana.mockReturnValue({
        services: {
          notifications: {
            toasts: {
              addError: mockAddError,
            },
          },
        },
      });

      const { getByTestId } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const submitButton = getByTestId('step-execute-modal-submit');

      await act(async () => {
        submitButton.click();
      });

      await waitFor(() => {
        expect(mockAddError).toHaveBeenCalledWith(
          new Error('Custom error message'),
          expect.objectContaining({
            title: expect.any(String),
          })
        );
      });
    });

    it('should not call mutateAsync when testStepModalOpenStepId is missing', async () => {
      const mockMutateAsync = jest.fn();
      mockUseWorkflowActions.mockReturnValue({
        runIndividualStep: { mutateAsync: mockMutateAsync },
      });

      renderModal({
        workflowId: 'workflow-1',
      });

      // Component should not render, so no submit should be possible
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  describe('closeModal', () => {
    it('should dispatch actions to close modal and clear replay execution id', async () => {
      const { getByTestId, store } = renderModal({
        testStepModalOpenStepId: 'test-step-id',
        workflowId: 'workflow-1',
        replayStepExecutionId: 'replay-1',
        editorYaml: 'name: Test Workflow\nsteps: []',
        execution: { id: 'execution-1', workflowDefinition: {} },
        workflowGraph: mockWorkflowGraph,
      });
      const closeButton = getByTestId('step-execute-modal-close');

      await act(async () => {
        closeButton.click();
      });

      expect(store.getState().detail.testStepModalOpenStepId).toBeUndefined();
      expect(store.getState().detail.replay?.stepExecutionId).toBeUndefined();
    });
  });
});
