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
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ExecutionStatus } from '@kbn/workflows';
import { WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID } from '@kbn/workflows/common/constants';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: ({
    workflowId,
    executionId,
  }: {
    workflowId: string;
    executionId?: string;
  }) => ({
    href: `/app/workflows/${workflowId}${executionId ? `?executionId=${executionId}` : ''}`,
    navigate: jest.fn(),
  }),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => undefined,
  useFetchConnector: () => ({ data: undefined }),
}));

const mockChildExecutions = new Map();
jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: () => ({ childExecutions: mockChildExecutions, isLoading: false }),
}));

const mockWaitingStepResume = {
  waitingStepExecutionId: undefined as string | undefined,
  waitingStepStartedAt: undefined as string | undefined,
  resumeMessage: undefined as string | undefined,
  resumeSchema: undefined,
  approvalLabels: undefined,
};

jest.mock('../model/use_waiting_step_resume', () => ({
  ...jest.requireActual('../model/use_waiting_step_resume'),
  useWaitingStepResume: () => mockWaitingStepResume,
}));

jest.mock('./resume_execution_button', () => ({
  ResumeExecutionButton: (props: {
    autoOpen?: boolean;
    waitingStepExecutionId?: string;
    executionId?: string;
    approvalLabels?: { approveLabel?: string };
    resumeSchema?: { properties?: Record<string, unknown> };
  }) => (
    <div
      data-test-subj="resume-execution-button"
      data-auto-open={String(Boolean(props.autoOpen))}
      data-waiting-step={props.waitingStepExecutionId ?? ''}
      data-execution-id={props.executionId ?? ''}
      data-approve-label={props.approvalLabels?.approveLabel ?? ''}
      data-schema-fields={
        props.resumeSchema?.properties ? Object.keys(props.resumeSchema.properties).join(',') : ''
      }
    />
  ),
}));

jest.mock('./workflow_step_execution_tree', () => ({
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
}));

jest.mock('./execution_take_action_split_button', () => ({
  ExecutionTakeActionSplitButton: () => <div data-test-subj="take-action" />,
}));

const mockPollingResult = {
  workflowExecution: undefined as ReturnType<typeof createMockWorkflowExecutionDto> | undefined,
  error: null as Error | null,
};

jest.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => ({
  useWorkflowExecutionPolling: () => mockPollingResult,
}));

type UseStepExecutionParams = Parameters<
  typeof import('../model/use_step_execution').useStepExecution
>;
/** Subset of useQuery result; tests override via mockReturnValue */
interface UseStepExecutionQueryStub {
  data: unknown;
  isLoading: boolean;
}

const mockUseStepExecution = jest.fn<UseStepExecutionQueryStub, UseStepExecutionParams>(() => ({
  data: {
    id: 'step-wait',
    stepId: 'request_approval',
    stepType: 'waitForInput',
    status: 'waiting_for_input',
    input: { message: 'Approve this' },
  },
  isLoading: false,
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: (...args: UseStepExecutionParams) => mockUseStepExecution(...args),
}));

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
    jest.clearAllMocks();
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
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
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

  it('shows a single resume control when the waiting step is selected', () => {
    mockWaitingStepResume.waitingStepExecutionId = 'step-wait';
    mockWaitingStepResume.waitingStepStartedAt = '2024-01-01T00:00:00Z';

    renderFlyout();
    fireEvent.click(screen.getByTestId('select-waiting-step'));

    const resumeButton = screen.getByTestId('resume-execution-button');
    expect(resumeButton).toHaveAttribute('data-waiting-step', 'step-wait');
    expect(resumeButton).toHaveAttribute('data-execution-id', 'exec-1');
  });

  it('keeps ?resume=true auto-opening when the waiting step is selected', () => {
    mockWaitingStepResume.waitingStepExecutionId = 'step-wait';
    mockWaitingStepResume.waitingStepStartedAt = '2024-01-01T00:00:00Z';

    renderFlyout('?resume=true');
    fireEvent.click(screen.getByTestId('select-waiting-step'));

    const resumeButton = screen.getByTestId('resume-execution-button');
    expect(resumeButton).toHaveAttribute('data-auto-open', 'true');
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
    jest.clearAllMocks();
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
    render(<WorkflowExecutionFlyout executionId="parent-exec" onClose={jest.fn()} />, {
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

  it('resumes a waiting child step against the child run', () => {
    mockWaitingStepResume.waitingStepExecutionId = undefined;
    mockChildExecutions.set('parent-execute', {
      ...childExecution,
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'child-lookup',
          stepId: 'hitl',
          stepType: 'waitForApproval',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          workflowRunId: 'child-exec-1',
          workflowId: 'flyout-test-child',
        }),
      ],
    });
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      id: 'parent-exec',
      workflowId: 'flyout-test-parent',
      status: ExecutionStatus.WAITING_FOR_CHILD,
      stepExecutions: parentExecution.stepExecutions,
    });
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'child-lookup',
        stepId: 'hitl',
        stepType: 'waitForApproval',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: { message: 'Approve the child', approveLabel: 'Approve' },
      },
      isLoading: false,
    });

    renderFlyout();
    fireEvent.click(screen.getByTestId('select-child-step'));

    const resumeButton = screen.getByTestId('resume-execution-button');
    expect(resumeButton).toHaveAttribute('data-execution-id', 'child-exec-1');
    expect(resumeButton).toHaveAttribute('data-waiting-step', 'child-lookup');
    expect(resumeButton).toHaveAttribute('data-approve-label', 'Approve');
  });

  it('resumes a waiting child waitForInput step with that step schema', () => {
    mockWaitingStepResume.waitingStepExecutionId = undefined;
    mockWaitingStepResume.resumeSchema = undefined;
    mockChildExecutions.set('parent-execute', {
      ...childExecution,
      status: ExecutionStatus.WAITING_FOR_INPUT,
      stepExecutions: [
        createMockStepExecutionDto({
          id: 'child-lookup',
          stepId: 'ask',
          stepType: 'waitForInput',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          workflowRunId: 'child-exec-1',
          workflowId: 'flyout-test-child',
        }),
      ],
    });
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      id: 'parent-exec',
      workflowId: 'flyout-test-parent',
      status: ExecutionStatus.WAITING_FOR_CHILD,
      stepExecutions: parentExecution.stepExecutions,
    });
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'child-lookup',
        stepId: 'ask',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: {
          message: 'Provide a reason',
          schema: { type: 'object', properties: { reason: { type: 'string' } } },
        },
      },
      isLoading: false,
    });

    renderFlyout();
    fireEvent.click(screen.getByTestId('select-child-step'));

    const resumeButton = screen.getByTestId('resume-execution-button');
    expect(resumeButton).toHaveAttribute('data-execution-id', 'child-exec-1');
    expect(resumeButton).toHaveAttribute('data-approve-label', '');
    expect(resumeButton).toHaveAttribute('data-schema-fields', 'reason');
  });
});

describe('WorkflowExecutionFlyout triggered by', () => {
  const profileUid = 'u_mGBROF_q5bm_A5E_0';
  const profile: UserProfileWithAvatar = {
    uid: profileUid,
    enabled: true,
    user: { username: 'elastic' },
    data: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockChildExecutions.clear();
    mockPollingResult.error = null;
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      id: 'exec-1',
      executedBy: profileUid,
    });
  });

  const createServices = ({
    showExecutor = true,
    isServerless = false,
  }: { showExecutor?: boolean; isServerless?: boolean } = {}) => {
    const services = createStartServicesMock();
    services.settings.client.get.mockImplementation((key: string, defaultValue?: unknown) =>
      key === WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID ? showExecutor : defaultValue
    );
    services.cloud.isServerlessEnabled = isServerless;
    return services;
  };

  const renderFlyout = (services = createServices()) => {
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
      wrapper: getTestProvider({ services }),
    });
    return services;
  };

  it('resolves the profile UID to the user display name', async () => {
    const services = createServices();
    services.userProfile.bulkGet.mockResolvedValue([profile]);

    renderFlyout(services);

    await waitFor(() =>
      expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).toHaveTextContent('elastic')
    );
    expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).not.toHaveTextContent(
      profileUid
    );
    expect(services.userProfile.bulkGet).toHaveBeenCalledWith({
      uids: new Set([profileUid]),
      dataPath: 'avatar',
    });
  });

  it('keeps the raw UID when the profile cannot be resolved', async () => {
    const services = createServices();
    services.userProfile.bulkGet.mockResolvedValue([]);

    renderFlyout(services);

    // Let any profile lookup settle before asserting the fallback.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).toHaveTextContent(profileUid);
  });

  it('hides the unresolved UID on serverless, like the execution list', async () => {
    const services = createServices({ isServerless: true });
    services.userProfile.bulkGet.mockResolvedValue([]);

    renderFlyout(services);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).not.toHaveTextContent(
      profileUid
    );
    expect(screen.queryByTestId('workflowExecutionFlyoutExecutedByCopy')).not.toBeInTheDocument();
  });

  it('does not look up profiles nor show the user when the show executor setting is off', async () => {
    const services = createServices({ showExecutor: false });
    services.userProfile.bulkGet.mockResolvedValue([profile]);

    renderFlyout(services);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(services.userProfile.bulkGet).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).not.toHaveTextContent(
      profileUid
    );
    expect(screen.getByTestId('workflowExecutionFlyoutExecutedBy')).not.toHaveTextContent(
      'elastic'
    );
    expect(screen.queryByTestId('workflowExecutionFlyoutExecutedByCopy')).not.toBeInTheDocument();
  });
});
