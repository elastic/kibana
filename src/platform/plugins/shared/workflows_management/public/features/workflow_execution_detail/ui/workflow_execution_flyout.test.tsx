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
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

const mockUrlState = {
  shouldAutoResume: false,
  clearResumeParam: jest.fn(),
};

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUrlState,
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => undefined,
  useFetchConnector: () => ({ data: undefined }),
}));

jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: () => ({ childExecutions: new Map(), isLoading: false }),
}));

const mockWaitingStepResume = {
  waitingStepExecutionId: undefined as string | undefined,
  waitingStepStartedAt: undefined as string | undefined,
  resumeMessage: undefined as string | undefined,
  resumeSchema: undefined,
  approvalLabels: undefined,
};

jest.mock('../model/use_waiting_step_resume', () => ({
  useWaitingStepResume: () => mockWaitingStepResume,
}));

jest.mock('./resume_execution_button', () => ({
  ResumeExecutionButton: (props: { autoOpen?: boolean; waitingStepExecutionId?: string }) => (
    <div
      data-test-subj="resume-execution-button"
      data-auto-open={String(Boolean(props.autoOpen))}
      data-waiting-step={props.waitingStepExecutionId ?? ''}
    />
  ),
}));

jest.mock('./workflow_step_execution_tree', () => ({
  WorkflowStepExecutionTree: ({
    onStepExecutionClick,
  }: {
    onStepExecutionClick: (id: string) => void;
  }) => (
    <button
      type="button"
      data-test-subj="select-waiting-step"
      onClick={() => onStepExecutionClick('step-wait')}
    >
      {'Select waiting step'}
    </button>
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

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: () => ({
    data: {
      id: 'step-wait',
      stepId: 'request_approval',
      stepType: 'waitForInput',
      status: 'waiting_for_input',
      input: { message: 'Approve this' },
    },
    isLoading: false,
  }),
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
    mockUrlState.shouldAutoResume = false;
    mockWaitingStepResume.waitingStepExecutionId = undefined;
    mockWaitingStepResume.waitingStepStartedAt = undefined;
    mockWaitingStepResume.resumeMessage = undefined;
    mockPollingResult.workflowExecution = waitingExecution;
    mockPollingResult.error = null;
  });

  const renderFlyout = () =>
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
      wrapper: getTestProvider({ services }),
    });

  it('does not show resume when the run is not waiting for input', () => {
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      status: ExecutionStatus.COMPLETED,
    });

    renderFlyout();

    expect(screen.queryByTestId('resume-execution-button')).not.toBeInTheDocument();
  });

  it('shows Provide action on the run and honors ?resume=true', () => {
    mockWaitingStepResume.waitingStepExecutionId = 'step-wait';
    mockWaitingStepResume.waitingStepStartedAt = '2024-01-01T00:00:00Z';
    mockWaitingStepResume.resumeMessage = 'Approve this';
    mockUrlState.shouldAutoResume = true;

    renderFlyout();

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
