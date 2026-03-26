/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionDetail } from './workflow_execution_detail';
import { TestWrapper } from '../../../shared/test_utils';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

jest.mock('./workflow_execution_panel', () => ({
  WorkflowExecutionPanel: () => <div data-test-subj="execution-panel" />,
}));

let capturedStepDetailsProps: Record<string, unknown> = {};
jest.mock('./workflow_step_execution_details', () => ({
  WorkflowStepExecutionDetails: (props: Record<string, unknown>) => {
    capturedStepDetailsProps = props;
    return <div data-test-subj="step-details" />;
  },
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: jest.fn(() => ({ childExecutions: new Map(), isLoading: false })),
}));

const mockSetSelectedStepExecution = jest.fn();
const mockUseWorkflowUrlState = jest.fn(() => ({
  activeTab: 'executions',
  setSelectedStepExecution: mockSetSelectedStepExecution,
  selectedStepExecutionId: '__overview',
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

const createMockExecution = (id: string): WorkflowExecutionDto => ({
  spaceId: 'default',
  id,
  status: ExecutionStatus.COMPLETED,
  error: null,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: '2024-01-01T00:01:00Z',
  workflowId: 'workflow-1',
  workflowName: 'Test Workflow',
  workflowDefinition: {
    version: '1',
    name: 'test',
    enabled: true,
    triggers: [],
    steps: [],
  } as WorkflowYaml,
  stepId: undefined,
  stepExecutions: [],
  duration: 60000,
  triggeredBy: 'manual',
  yaml: 'version: "1"',
});

const mockUseWorkflowExecutionPolling = jest.fn((_executionId: string) => ({
  workflowExecution: createMockExecution('exec-1'),
  isLoading: false,
  error: null,
}));
jest.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => ({
  useWorkflowExecutionPolling: (executionId: string) =>
    mockUseWorkflowExecutionPolling(executionId),
}));

describe('WorkflowExecutionDetail - cache invalidation', () => {
  let mockRemoveQueries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      removeQueries: mockRemoveQueries,
    } as any);
  });

  it('should call removeQueries on unmount with the current execution query key', () => {
    const { unmount } = render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(mockRemoveQueries).not.toHaveBeenCalled();

    unmount();

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['stepExecution', 'exec-1'],
    });
  });

  it('should call removeQueries for the previous execution when executionId changes', () => {
    const { rerender } = render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(mockRemoveQueries).not.toHaveBeenCalled();

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: createMockExecution('exec-2'),
      isLoading: false,
      error: null,
    });

    rerender(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-2" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(mockRemoveQueries).toHaveBeenCalledWith({
      queryKey: ['stepExecution', 'exec-1'],
    });
  });
});

describe('WorkflowExecutionDetail - pausedStepDef resolution', () => {
  let mockRemoveQueries: jest.Mock;

  const waitingStepExecution = {
    id: 'step-exec-1',
    stepId: 'request_approval',
    stepType: 'waitForInput',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    startedAt: '2024-01-01T00:00:00Z',
    globalExecutionIndex: 0,
  };

  const waitingExecution = (steps: WorkflowYaml['steps']): WorkflowExecutionDto => ({
    spaceId: 'default',
    id: 'exec-waiting',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    error: null,
    isTestRun: false,
    startedAt: '2024-01-01T00:00:00Z',
    finishedAt: '',
    workflowId: 'workflow-1',
    workflowName: 'Test Workflow',
    workflowDefinition: {
      version: '1',
      name: 'test',
      enabled: true,
      triggers: [],
      steps,
    } as WorkflowYaml,
    stepId: undefined,
    stepExecutions: [waitingStepExecution as any],
    duration: 0,
    triggeredBy: 'manual',
    yaml: 'version: "1"',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    capturedStepDetailsProps = {};
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({ removeQueries: mockRemoveQueries } as any);
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setSelectedStepExecution: mockSetSelectedStepExecution,
      selectedStepExecutionId: 'step-exec-1',
    } as any);
  });

  it('resolves resumeMessage and resumeSchema for a top-level waitForInput step', () => {
    const steps: WorkflowYaml['steps'] = [
      {
        name: 'request_approval',
        type: 'waitForInput',
        with: {
          message: 'Top-level approval required',
          schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
        },
      } as any,
    ];

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: waitingExecution(steps),
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(capturedStepDetailsProps.resumeMessage).toBe('Top-level approval required');
    expect(capturedStepDetailsProps.resumeSchema).toMatchObject({ type: 'object' });
  });

  it('resolves resumeMessage and resumeSchema for a waitForInput step nested inside if', () => {
    const steps: WorkflowYaml['steps'] = [
      {
        name: 'should_ask',
        type: 'if',
        condition: 'true',
        steps: [
          {
            name: 'request_approval',
            type: 'waitForInput',
            with: {
              message: 'Nested approval required',
              schema: { type: 'object', properties: { severity: { type: 'string' } } },
            },
          },
        ],
      } as any,
    ];

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: waitingExecution(steps),
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(capturedStepDetailsProps.resumeMessage).toBe('Nested approval required');
    expect(capturedStepDetailsProps.resumeSchema).toMatchObject({ type: 'object' });
  });

  it('resolves resumeSchema for a waitForInput step nested inside foreach', () => {
    const steps: WorkflowYaml['steps'] = [
      {
        name: 'process_each_item',
        type: 'foreach',
        foreach: '["alpha","beta"]',
        steps: [
          {
            name: 'request_approval',
            type: 'waitForInput',
            with: {
              message: 'Approve item {{ foreach.item }}',
              schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
            },
          },
        ],
      } as any,
    ];

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: waitingExecution(steps),
      isLoading: false,
      error: null,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(capturedStepDetailsProps.resumeSchema).toMatchObject({ type: 'object' });
    expect(capturedStepDetailsProps.resumeMessage).toBe('Approve item {{ foreach.item }}');
  });
});

describe('WorkflowExecutionDetail - auto-select overview on failed before steps', () => {
  let mockRemoveQueries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      removeQueries: mockRemoveQueries,
    } as any);
  });

  it('should auto-select overview when execution is terminal with no step executions', () => {
    const failedExecution = {
      ...createMockExecution('exec-fail'),
      status: ExecutionStatus.FAILED,
      error: { type: 'InputValidationError', message: 'name: Required' },
      stepExecutions: [],
    };

    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: failedExecution,
      isLoading: false,
      error: null,
    });

    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setSelectedStepExecution: mockSetSelectedStepExecution,
      selectedStepExecutionId: '',
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-fail" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('__overview');
  });
});
