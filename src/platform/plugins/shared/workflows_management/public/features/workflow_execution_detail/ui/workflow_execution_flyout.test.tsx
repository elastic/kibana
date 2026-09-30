/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

vi.mock('../../../hooks/navigation/use_navigate_to_execution', () => {
  const mocked = {
    useNavigateToExecution: ({
      workflowId,
      executionId,
    }: {
      workflowId: string;
      executionId?: string;
    }) => ({
      href: `/app/workflows/${workflowId}${executionId ? `?executionId=${executionId}` : ''}`,
      navigate: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../entities/connectors/model/use_available_connectors', () => {
  const mocked = {
    useAvailableConnectors: () => undefined,
    useFetchConnector: () => ({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});

const mockChildExecutions = new Map();
vi.mock('../model/use_child_workflow_executions', () => {
  const mocked = {
    useChildWorkflowExecutions: () => ({ childExecutions: mockChildExecutions, isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

const mockWaitingStepResume = {
  waitingStepExecutionId: undefined as string | undefined,
  waitingStepStartedAt: undefined as string | undefined,
  resumeMessage: undefined as string | undefined,
  resumeSchema: undefined,
  approvalLabels: undefined,
};

vi.mock('../model/use_waiting_step_resume', () => {
  const mocked = {
    useWaitingStepResume: () => mockWaitingStepResume,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./resume_execution_button', () => {
  const mocked = {
    ResumeExecutionButton: (props: { autoOpen?: boolean; waitingStepExecutionId?: string }) => (
      <div
        data-test-subj="resume-execution-button"
        data-auto-open={String(Boolean(props.autoOpen))}
        data-waiting-step={props.waitingStepExecutionId ?? ''}
      />
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./workflow_step_execution_tree', () => {
  const mocked = {
    WorkflowStepExecutionTree: ({
      onStepExecutionClick,
    }: {
      onStepExecutionClick: (id: string) => void;
    }) => (
      <>
        <button
          type="button"
          data-test-subj="select-waiting-step"
          onClick={() => onStepExecutionClick('step-wait')}
        >
          {'Select waiting step'}
        </button>
        <button
          type="button"
          data-test-subj="select-execute-step"
          onClick={() => onStepExecutionClick('parent-execute')}
        >
          {'Select execute step'}
        </button>
        <button
          type="button"
          data-test-subj="select-child-step"
          onClick={() => onStepExecutionClick('child-lookup')}
        >
          {'Select child step'}
        </button>
      </>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./execution_take_action_split_button', () => {
  const mocked = {
    ExecutionTakeActionSplitButton: () => <div data-test-subj="take-action" />,
  };
  return { ...mocked, default: mocked };
});

const mockPollingResult = {
  workflowExecution: undefined as ReturnType<typeof createMockWorkflowExecutionDto> | undefined,
  error: null as Error | null,
};

vi.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => {
  const mocked = {
    useWorkflowExecutionPolling: () => mockPollingResult,
  };
  return { ...mocked, default: mocked };
});

type UseStepExecutionParams = Parameters<
  typeof import('../model/use_step_execution').useStepExecution
>;
/** Subset of useQuery result; tests override via mockReturnValue */
interface UseStepExecutionQueryStub {
  data: unknown;
  isLoading: boolean;
}

const mockUseStepExecution = vi.fn<(...args: UseStepExecutionParams) => UseStepExecutionQueryStub>(
  () => ({
    data: {
      id: 'step-wait',
      stepId: 'request_approval',
      stepType: 'waitForInput',
      status: 'waiting_for_input',
      input: { message: 'Approve this' },
    },
    isLoading: false,
  })
);

vi.mock('../model/use_step_execution', () => {
  const mocked = {
    useStepExecution: (...args: UseStepExecutionParams) => mockUseStepExecution(...args),
  };
  return { ...mocked, default: mocked };
});

describe('WorkflowExecutionFlyout resume', () => {
  const services = createStartServicesMock();

  const waitingExecution = createMockWorkflowExecutionDto({
    id: 'exec-1',
    workflowId: 'wf-1',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    stepExecutions: [
      createMockStepExecutionDto({
        id: 'step-wait',
        stepId: 'request_approval',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T00:00:00Z',
      }),
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockWaitingStepResume.waitingStepExecutionId = undefined;
    mockWaitingStepResume.waitingStepStartedAt = undefined;
    mockWaitingStepResume.resumeMessage = undefined;
    mockPollingResult.workflowExecution = waitingExecution;
    mockPollingResult.error = null;
    mockChildExecutions.clear();
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-wait',
        stepId: 'request_approval',
        stepType: 'waitForInput',
        status: 'waiting_for_input',
        input: { message: 'Approve this' },
      },
      isLoading: false,
    });
  });

  // The flyout reads `?resume=true` and the selected step from the URL.
  const renderFlyout = (search = '') =>
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={vi.fn()} />, {
      wrapper: getTestProvider({ services, initialEntries: [`/${search}`] }),
    });

  it('does not show resume when the run is not waiting for input', () => {
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.COMPLETED,
    });

    renderFlyout();

    expect(screen.queryByTestId('resume-execution-button')).not.toBeInTheDocument();
  });

  it('does not show resume from ?resume=true until the waiting step is ready', () => {
    renderFlyout('?resume=true');

    expect(screen.queryByTestId('resume-execution-button')).not.toBeInTheDocument();
  });

  it('shows Provide action on the run and honors ?resume=true', () => {
    mockWaitingStepResume.waitingStepExecutionId = 'step-wait';
    mockWaitingStepResume.waitingStepStartedAt = '2024-01-01T00:00:00Z';
    mockWaitingStepResume.resumeMessage = 'Approve this';
    renderFlyout('?resume=true');

    const resumeButtons = screen.getAllByTestId('resume-execution-button');
    expect(resumeButtons).toHaveLength(1);
    expect(resumeButtons[0]).toHaveAttribute('data-auto-open', 'true');
    expect(resumeButtons[0]).toHaveAttribute('data-waiting-step', 'step-wait');
  });

  it('also shows resume on the waiting step Input section', () => {
    mockWaitingStepResume.waitingStepExecutionId = 'step-wait';
    mockWaitingStepResume.waitingStepStartedAt = '2024-01-01T00:00:00Z';

    renderFlyout();
    fireEvent.click(screen.getByTestId('select-waiting-step'));

    const resumeButtons = screen.getAllByTestId('resume-execution-button');
    expect(resumeButtons).toHaveLength(2);
    expect(resumeButtons.map((button) => button.getAttribute('data-waiting-step'))).toEqual([
      'step-wait',
      'step-wait',
    ]);
    // Only the always-visible run control auto-opens from ?resume=true.
    expect(resumeButtons[0]).toHaveAttribute('data-auto-open', 'false');
    expect(resumeButtons[1]).toHaveAttribute('data-auto-open', 'false');
  });
});

describe('WorkflowExecutionFlyout child workflow steps', () => {
  const services = createStartServicesMock();

  const childStep = createMockStepExecutionDto({
    id: 'child-lookup',
    stepId: 'lookup_host',
    stepType: 'data.set',
    status: ExecutionStatus.COMPLETED,
  });

  const childExecution = {
    parentStepExecutionId: 'parent-execute',
    workflowId: 'flyout-test-child',
    workflowName: 'Flyout test - child',
    executionId: 'child-exec-1',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [childStep],
  };

  const parentExecution = createMockWorkflowExecutionDto({
    id: 'parent-exec',
    workflowId: 'flyout-test-parent',
    status: ExecutionStatus.COMPLETED,
    stepExecutions: [
      createMockStepExecutionDto({
        id: 'parent-execute',
        stepId: 'run_child',
        stepType: 'workflow.execute',
        status: ExecutionStatus.COMPLETED,
      }),
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockChildExecutions.clear();
    mockChildExecutions.set('parent-execute', childExecution);
    mockPollingResult.workflowExecution = parentExecution;
    mockPollingResult.error = null;
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'child-lookup',
        stepId: 'lookup_host',
        input: { hostname: 'workstation-7' },
        output: { risk: 'high' },
      },
      isLoading: false,
    });
  });

  const renderFlyout = () =>
    render(<WorkflowExecutionFlyout executionId="parent-exec" onClose={vi.fn()} />, {
      wrapper: getTestProvider({ services }),
    });

  it('fetches I/O from the child run and links to it when a child step is selected', () => {
    renderFlyout();
    fireEvent.click(screen.getByTestId('select-child-step'));

    expect(mockUseStepExecution).toHaveBeenCalledWith(
      'child-exec-1',
      'child-lookup',
      ExecutionStatus.COMPLETED
    );
    const owningLink = screen.getByTestId('workflowExecutionOwningRunLink');
    expect(owningLink).toHaveTextContent('Flyout test - child: lookup_host');
    expect(owningLink).toHaveAttribute(
      'href',
      '/app/workflows/flyout-test-child?executionId=child-exec-1'
    );
    expect(screen.getByText('hostname')).toBeInTheDocument();
    expect(screen.getByText('workstation-7')).toBeInTheDocument();
  });

  it('links a workflow.execute step to the child run and fetches parent I/O', () => {
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'parent-execute',
        stepId: 'run_child',
        input: { 'workflow-id': 'flyout-test-child' },
        output: { status: 'completed' },
      },
      isLoading: false,
    });

    renderFlyout();
    fireEvent.click(screen.getByTestId('select-execute-step'));

    expect(mockUseStepExecution).toHaveBeenCalledWith(
      'parent-exec',
      'parent-execute',
      ExecutionStatus.COMPLETED
    );
    const childLink = screen.getByTestId('workflowExecutionChildRunLink');
    expect(childLink).toHaveTextContent('workflow.execute: Flyout test - child');
    expect(childLink).toHaveAttribute(
      'href',
      '/app/workflows/flyout-test-child?executionId=child-exec-1'
    );
  });
});
