/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionDetail } from './workflow_execution_detail';
import {
  createMockStepExecutionDto,
  createMockWorkflowYaml,
  TestWrapper,
} from '../../../shared/test_utils';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));
const mockUseQueryClient = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

const mockSetSelectedStepExecution = jest.fn();
const mockUrlState: {
  selectedStepExecutionId: string | undefined;
  shouldAutoResume: boolean;
} = {
  selectedStepExecutionId: undefined,
  shouldAutoResume: false,
};

const mockUseWorkflowUrlState = jest.fn(() => ({
  activeTab: 'executions',
  setSelectedStepExecution: mockSetSelectedStepExecution,
  selectedStepExecutionId: mockUrlState.selectedStepExecutionId,
  shouldAutoResume: mockUrlState.shouldAutoResume,
}));
jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => mockUseWorkflowUrlState(),
}));

// Track captured props for header / list / resume button
const capturedHeaderProps: { current: Record<string, unknown> } = { current: {} };
const capturedListProps: { current: Record<string, unknown> } = { current: {} };
const capturedResumeProps: { current: Record<string, unknown> } = { current: {} };

jest.mock('./workflow_execution_header', () => ({
  WorkflowExecutionTopBar: (props: Record<string, unknown>) => {
    capturedHeaderProps.current = props;
    return (
      <div data-test-subj="execution-header">
        <div data-test-subj="header-show-back-button">{String(props.showBackButton)}</div>
      </div>
    );
  },
}));

jest.mock('./workflow_execution_step_list', () => ({
  WorkflowExecutionStepList: (props: Record<string, unknown>) => {
    capturedListProps.current = props;
    return (
      <div data-test-subj="execution-step-list">
        <div data-test-subj="list-expanded-id">{String(props.expandedStepExecutionId ?? '')}</div>
      </div>
    );
  },
}));

jest.mock('./resume_execution_button', () => ({
  ResumeExecutionButton: (props: Record<string, unknown>) => {
    capturedResumeProps.current = props;
    return (
      <div data-test-subj="resume-button">
        <div data-test-subj="resume-message">{String(props.resumeMessage ?? '')}</div>
        <div data-test-subj="resume-auto-open">{String(props.autoOpen)}</div>
      </div>
    );
  },
}));

type UseStepExecutionParams = Parameters<
  typeof import('../model/use_step_execution').useStepExecution
>;
interface UseStepExecutionQueryStub {
  data: unknown;
  isLoading: boolean;
}

const mockUseStepExecution = jest.fn<UseStepExecutionQueryStub, UseStepExecutionParams>(() => ({
  data: undefined,
  isLoading: false,
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: (...args: UseStepExecutionParams) => mockUseStepExecution(...args),
}));

const mockChildExecutions = new Map();
jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: jest.fn(() => ({
    childExecutions: mockChildExecutions,
    isLoading: false,
  })),
}));

const mockPollingResult: {
  workflowExecution: WorkflowExecutionDto | undefined;
  error: Error | null;
  isLoading?: boolean;
} = {
  workflowExecution: undefined,
  error: null,
};

const mockUseWorkflowExecutionPolling = jest.fn((): typeof mockPollingResult => mockPollingResult);
jest.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => ({
  useWorkflowExecutionPolling: () => mockUseWorkflowExecutionPolling(),
}));

const createMockExecution = (
  overrides: Partial<WorkflowExecutionDto> = {}
): WorkflowExecutionDto => ({
  spaceId: 'default',
  id: 'exec-1',
  status: ExecutionStatus.COMPLETED,
  error: null,
  isTestRun: false,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: '2024-01-01T00:01:00Z',
  workflowId: 'workflow-1',
  workflowName: 'Test Workflow',
  workflowDefinition: createMockWorkflowYaml(),
  stepId: undefined,
  stepExecutions: [],
  duration: 60000,
  triggeredBy: 'manual',
  yaml: 'version: "1"',
  ...overrides,
});

describe('WorkflowExecutionDetail', () => {
  let mockRemoveQueries: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({
      removeQueries: mockRemoveQueries,
    } as unknown as ReturnType<typeof useQueryClient>);
    mockUseStepExecution.mockReturnValue({ data: undefined, isLoading: false });
    mockUrlState.selectedStepExecutionId = undefined;
    mockUrlState.shouldAutoResume = false;
    mockPollingResult.workflowExecution = undefined;
    mockPollingResult.error = null;
    mockChildExecutions.clear();
    capturedHeaderProps.current = {};
    capturedListProps.current = {};
    capturedResumeProps.current = {};
  });

  describe('cache invalidation', () => {
    it('should call removeQueries on unmount with the current execution query key', () => {
      mockPollingResult.workflowExecution = createMockExecution({ id: 'exec-1' });

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
      mockPollingResult.workflowExecution = createMockExecution({ id: 'exec-1' });

      const { rerender } = render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(mockRemoveQueries).not.toHaveBeenCalled();

      mockPollingResult.workflowExecution = createMockExecution({ id: 'exec-2' });

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

  describe('layout', () => {
    it('renders header, tabs, and step list', () => {
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('execution-header')).toBeInTheDocument();
      expect(screen.getByTestId('execution-step-list')).toBeInTheDocument();
      expect(screen.getByTestId('workflowExecutionViewTab_table')).toBeInTheDocument();
      expect(screen.getByTestId('workflowExecutionViewTab_tracers')).toBeInTheDocument();
      expect(screen.getByTestId('workflowExecutionViewTab_json')).toBeInTheDocument();
    });

    it('shows back button when activeTab is executions', () => {
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('header-show-back-button')).toHaveTextContent('true');
    });
  });

  describe('expanded step propagation', () => {
    it('passes selectedStepExecutionId from URL state to the list as expandedStepExecutionId', () => {
      mockUrlState.selectedStepExecutionId = 'step-exec-1';
      mockPollingResult.workflowExecution = createMockExecution({
        stepExecutions: [
          createMockStepExecutionDto({
            id: 'step-exec-1',
            stepId: 'someStep',
            status: ExecutionStatus.COMPLETED,
            startedAt: '2024-01-01T10:00:00Z',
          }),
        ],
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('list-expanded-id')).toHaveTextContent('step-exec-1');
    });
  });

  describe('child workflow step resolution', () => {
    it('finds step in child executions when not in root steps', () => {
      const rootStep = createMockStepExecutionDto({
        id: 'root-step-exec',
        stepId: 'rootStep',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T10:00:00Z',
      });

      const childStep = createMockStepExecutionDto({
        id: 'child-step-exec',
        stepId: 'childStep',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T10:01:00Z',
      });

      mockChildExecutions.set('root-step-exec', {
        parentStepExecutionId: 'root-step-exec',
        workflowId: 'child-wf',
        workflowName: 'Child Workflow',
        executionId: 'child-exec-1',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [childStep],
      });

      mockUrlState.selectedStepExecutionId = 'child-step-exec';
      mockPollingResult.workflowExecution = createMockExecution({
        stepExecutions: [rootStep],
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      // useStepExecution should be called with the child execution id, not the parent's
      expect(mockUseStepExecution).toHaveBeenCalledWith(
        'child-exec-1',
        'child-step-exec',
        ExecutionStatus.COMPLETED
      );
    });
  });

  describe('resume execution button', () => {
    it('renders ResumeExecutionButton when execution is WAITING_FOR_INPUT', () => {
      const waitStep = createMockStepExecutionDto({
        id: 'step-exec-1',
        stepId: 'waitStep',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T10:00:00Z',
      });

      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        stepExecutions: [waitStep],
      });

      mockUseStepExecution.mockImplementation((_executionId, stepExecutionId) => {
        if (stepExecutionId === 'step-exec-1') {
          return {
            data: {
              id: 'step-exec-1',
              status: ExecutionStatus.WAITING_FOR_INPUT,
              input: { message: 'Please confirm' },
            },
            isLoading: false,
          };
        }
        return { data: undefined, isLoading: false };
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.getByTestId('resume-message')).toHaveTextContent('Please confirm');
    });

    it('does not render ResumeExecutionButton when execution is not WAITING_FOR_INPUT', () => {
      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();
    });

    it('passes shouldAutoResume from URL state to ResumeExecutionButton', () => {
      mockUrlState.shouldAutoResume = true;

      const waitStep = createMockStepExecutionDto({
        id: 'step-exec-1',
        stepId: 'waitStep',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T10:00:00Z',
      });

      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        stepExecutions: [waitStep],
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('resume-auto-open')).toHaveTextContent('true');
    });
  });
});
