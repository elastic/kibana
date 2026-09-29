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
import { vi } from 'vitest';
import type { Mock, MockedFunction } from 'vitest';

import { useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { WorkflowDetailTestStepModal } from './workflow_detail_test_step_modal';
import { initialLoadingState } from '../../../entities/workflows/store/workflow_detail/utils/loading_states';
import { mockWorkflowsManagementCapabilities } from '../../../hooks/__mocks__/use_workflows_capabilities';
import { TestWrapper } from '../../../shared/test_utils';

// --- Mocks ---

const mockDispatch = vi.fn();
const mockSetSelectedExecution = vi.fn();
const mockMutateAsync = vi.fn();

vi.mock('react-redux-v7', () => {
  const actual = require('react-redux-v7');
  return {
    ...actual,
    useDispatch: () => mockDispatch,
    useSelector: (selector: Function) => selector(mockSelectorState),
  };
});

vi.mock('../../../hooks/use_kibana');

const mockAddError = vi.fn();
const mockKibanaValue = {
  services: {
    notifications: {
      toasts: {
        addError: mockAddError,
      },
    },
  },
};

vi.mock('../../../hooks/use_space_id', () => {
  const mocked = {
    useSpaceId: () => 'default',
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/use_workflow_url_state', () => {
  const mocked = {
    useWorkflowUrlState: () => ({
      setSelectedExecution: mockSetSelectedExecution,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_context_override_data', () => {
  const mocked = {
    useContextOverrideData: () => () => ({
      contextOverride: { key: 'value' },
      schema: null,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../entities/workflows/model/use_workflow_actions', () => {
  const mocked = {
    useWorkflowActions: () => ({
      runIndividualStep: {
        mutateAsync: mockMutateAsync,
      },
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../features/run_workflow/ui/step_execute_modal', () => {
  const mocked = {
    StepExecuteModal: ({
      onSubmit,
      onClose,
      stepId,
    }: {
      onSubmit: (params: { stepInputs: Record<string, unknown> }) => void;
      onClose: () => void;
      stepId: string;
    }) => (
      <div data-test-subj="step-execute-modal">
        <div data-test-subj="modal-step-id">{stepId}</div>
        <button
          type="button"
          data-test-subj="submit-step"
          onClick={() => onSubmit({ stepInputs: { input1: 'val1' } })}
        >
          {'Submit'}
        </button>
        <button type="button" data-test-subj="close-modal" onClick={onClose}>
          {'Close'}
        </button>
      </div>
    ),
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

// Selector state for useSelector mock
let mockSelectorState: Record<string, unknown> = {};

const buildMockState = (detailOverrides: Record<string, unknown> = {}) => ({
  detail: {
    yamlString: 'name: Test\nsteps:\n  - name: step1\n    type: noop',
    isYamlSynced: true,
    workflow: { id: 'wf-1', name: 'Test Workflow' },
    testStepModalOpenStepId: undefined,
    replay: undefined,
    execution: undefined,
    computed: { workflowGraph: null },
    loading: initialLoadingState,
    hasYamlSchemaValidationErrors: false,
    activeTab: 'workflow',
    ...detailOverrides,
  },
});

describe('WorkflowDetailTestStepModal', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    mockUseWorkflowsCapabilities.mockReturnValue(mockWorkflowsManagementCapabilities);

    const { useKibana } = (await vi.importMock('../../../hooks/use_kibana')) as {
      useKibana: Mock;
    };
    useKibana.mockReturnValue(mockKibanaValue);

    mockSelectorState = buildMockState();
  });

  it('should render nothing when testStepModalOpenStepId is undefined', () => {
    mockSelectorState = buildMockState({ testStepModalOpenStepId: undefined });

    const { container } = render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    expect(container.innerHTML).toBe('');
  });

  it('should render the StepExecuteModal when testStepModalOpenStepId is set and contextOverride is available', () => {
    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    expect(screen.getByTestId('step-execute-modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-step-id')).toHaveTextContent('step1');
  });

  it('should dispatch setTestStepModalOpenStepId(undefined) and setReplayStepExecutionId(null) when close is clicked', () => {
    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('close-modal'));

    // Should dispatch two actions to close modal and clear replay
    expect(mockDispatch).toHaveBeenCalledTimes(2);
  });

  it('should call runIndividualStep.mutateAsync on submit and set execution on success', async () => {
    mockMutateAsync.mockResolvedValueOnce({ workflowExecutionId: 'exec-1' });

    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('submit-step'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'step1',
          workflowId: 'wf-1',
          contextOverride: { input1: 'val1' },
        })
      );
    });

    await waitFor(() => {
      expect(mockSetSelectedExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  it('should show an error toast when submit fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(
      Object.assign(new Error('Internal error'), {
        body: { message: 'Step execution failed' },
      })
    );

    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('submit-step'));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          title: expect.any(String),
        })
      );
    });
  });

  it('does not render when executeWorkflow is not granted', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...mockWorkflowsManagementCapabilities,
      canExecuteWorkflow: false,
    });

    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    const { queryByTestId } = render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    expect(queryByTestId('step-execute-modal')).not.toBeInTheDocument();
  });

  it('should use error.message as fallback when body.message is not available', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Generic failure'));

    mockSelectorState = buildMockState({
      testStepModalOpenStepId: 'step1',
    });

    render(
      <TestWrapper>
        <WorkflowDetailTestStepModal />
      </TestWrapper>
    );

    fireEvent.click(screen.getByTestId('submit-step'));

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalledWith(new Error('Generic failure'), expect.anything());
    });
  });
});
