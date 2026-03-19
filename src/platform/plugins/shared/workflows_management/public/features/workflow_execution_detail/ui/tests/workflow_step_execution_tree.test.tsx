/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { TestWrapper } from '../../../../shared/test_utils/test_wrapper';
import { WorkflowStepExecutionTree } from '../workflow_step_execution_tree';

// Mock the workflows module functions
jest.mock('@kbn/workflows', () => {
  const actual = jest.requireActual('@kbn/workflows');
  return {
    ...actual,
    isTerminalStatus: jest.fn(),
    isInProgressStatus: jest.fn(),
    isDangerousStatus: jest.fn(),
  };
});

// Mock buildStepExecutionsTree function
jest.mock('../build_step_executions_tree', () => ({
  buildStepExecutionsTree: jest.fn(),
}));

// Mock child components
jest.mock('../step_execution_tree_item_label', () => ({
  StepExecutionTreeItemLabel: ({
    stepId,
    stepType,
    selected,
    status,
    executionIndex,
    executionTimeMs,
    onClick,
  }: {
    stepId: string;
    stepType: string;
    selected: boolean;
    status?: ExecutionStatus;
    executionIndex: number;
    executionTimeMs: number | null;
    onClick?: React.MouseEventHandler;
  }) => (
    <span
      data-test-subj="step-execution-tree-item-label"
      data-step-id={stepId}
      data-step-type={stepType}
      data-selected={selected}
      data-status={status}
      data-execution-index={executionIndex}
      data-execution-time-ms={executionTimeMs}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(e as unknown as React.MouseEvent);
        }
      }}
    >
      {stepId}
    </span>
  ),
}));

jest.mock('../../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: ({
    stepType,
    executionStatus,
    onClick,
  }: {
    stepType: string;
    executionStatus: ExecutionStatus | null;
    onClick?: React.MouseEventHandler;
  }) => (
    <span
      data-test-subj="step-icon"
      data-step-type={stepType}
      data-execution-status={executionStatus}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(e as unknown as React.MouseEvent);
        }
      }}
    >
      {'Icon'}
    </span>
  ),
}));

describe('WorkflowStepExecutionTree', () => {
  // Import the mocked functions
  const { isTerminalStatus, isInProgressStatus, isDangerousStatus } = jest.requireMock(
    '@kbn/workflows'
  ) as {
    isTerminalStatus: jest.Mock;
    isInProgressStatus: jest.Mock;
    isDangerousStatus: jest.Mock;
  };

  const { buildStepExecutionsTree } = jest.requireMock('../build_step_executions_tree') as {
    buildStepExecutionsTree: jest.Mock;
  };

  // Helper function to create a mock step execution
  const createMockStepExecution = (
    overrides: Partial<WorkflowStepExecutionDto> = {}
  ): WorkflowStepExecutionDto => ({
    id: 'step-exec-1',
    stepId: 'step-1',
    stepType: 'action',
    scopeStack: [],
    workflowRunId: 'workflow-run-1',
    workflowId: 'workflow-1',
    status: ExecutionStatus.COMPLETED,
    startedAt: '2024-01-01T10:00:00Z',
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    executionTimeMs: 5000,
    ...overrides,
  });

  // Helper function to create a mock execution
  const createMockExecution = (
    overrides: Partial<WorkflowExecutionDto> = {}
  ): WorkflowExecutionDto => ({
    id: 'exec-123',
    isTestRun: false,
    spaceId: 'default',
    status: ExecutionStatus.RUNNING,
    startedAt: '2024-01-01T10:00:00Z',
    finishedAt: '',
    error: null,
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
    ...overrides,
  });

  // Helper function to create a mock workflow definition
  const createMockDefinition = (overrides: Partial<WorkflowYaml> = {}): WorkflowYaml => ({
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
    ...overrides,
  });

  const mockOnStepExecutionClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mock implementations
    isTerminalStatus.mockReturnValue(false);
    isInProgressStatus.mockReturnValue(false);
    isDangerousStatus.mockReturnValue(false);
    buildStepExecutionsTree.mockReturnValue([]);
  });

  describe('loading state', () => {
    it('should display loading state when execution is null', () => {
      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={null}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Loading step executions...')).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should display error message when error is provided', () => {
      const error = new Error('Failed to load step executions');

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution()}
            definition={createMockDefinition()}
            error={error}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Error loading step executions')).toBeInTheDocument();
      expect(screen.getByText('Failed to load step executions')).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should display empty state when execution has no step executions and is not in progress', () => {
      isInProgressStatus.mockReturnValue(false);

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [],
      });

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('No step executions found')).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
      expect(isInProgressStatus).toHaveBeenCalledWith(ExecutionStatus.COMPLETED);
    });

    it('should not display empty state when execution is in progress even with no step executions', () => {
      isInProgressStatus.mockReturnValue(true);
      isTerminalStatus.mockReturnValue(false);

      const execution = createMockExecution({
        status: ExecutionStatus.RUNNING,
        stepExecutions: [],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-1-action-0',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('No step executions found')).not.toBeInTheDocument();
      expect(
        screen.getByRole('list', { name: 'Workflow step execution tree' })
      ).toBeInTheDocument();
    });
  });

  describe('tree rendering', () => {
    it('should render tree with step executions', () => {
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
        stepType: 'action',
        status: ExecutionStatus.COMPLETED,
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(buildStepExecutionsTree).toHaveBeenCalledWith(
        [stepExecution],
        expect.objectContaining({}),
        'completed'
      );
      expect(
        screen.getByRole('list', { name: 'Workflow step execution tree' })
      ).toBeInTheDocument();
      expect(screen.getByTestId('step-execution-tree-item-label')).toBeInTheDocument();
    });

    it('should render tree with nested step executions', () => {
      isTerminalStatus.mockReturnValue(true);

      const parentStepExecution = createMockStepExecution({
        id: 'parent-exec',
        stepId: 'parent-step',
        stepType: 'foreach',
      });

      const childStepExecution = createMockStepExecution({
        id: 'child-exec',
        stepId: 'child-step',
        stepType: 'action',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [parentStepExecution, childStepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'parent-step',
            type: 'foreach',
            foreach: 'item',
            steps: [
              {
                name: 'child-step',
                type: 'log',
              },
            ],
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'parent-exec',
          stepId: 'parent-step',
          stepType: 'foreach',
          executionIndex: 0,
          children: [
            {
              stepExecutionId: 'child-exec',
              stepId: 'child-step',
              stepType: 'action',
              executionIndex: 0,
              children: [],
            },
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const labels = screen.getAllByTestId('step-execution-tree-item-label');
      expect(labels).toHaveLength(2);
      expect(labels[0]).toHaveAttribute('data-step-id', 'parent-step');
      expect(labels[1]).toHaveAttribute('data-step-id', 'child-step');
    });

    it('should create skeleton step executions for non-terminal status', () => {
      isTerminalStatus.mockReturnValue(false);
      isInProgressStatus.mockReturnValue(true); // Running is in progress

      const execution = createMockExecution({
        status: ExecutionStatus.RUNNING,
        stepExecutions: [],
        stepId: 'step-1',
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'log',
          },
          {
            name: 'step-2',
            type: 'log',
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-1-log-0',
          stepId: 'step-1',
          stepType: 'log',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      // Verify that skeleton step executions are created for the executed step
      expect(buildStepExecutionsTree).toHaveBeenCalled();
      const callArgs = buildStepExecutionsTree.mock.calls[0][0];
      expect(callArgs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            stepId: 'step-1',
            stepType: 'log',
            status: ExecutionStatus.PENDING,
          }),
        ])
      );

      expect(isTerminalStatus).toHaveBeenCalledWith(ExecutionStatus.RUNNING);
    });

    it('should not create skeleton step executions for terminal status', () => {
      isTerminalStatus.mockReturnValue(true);
      isInProgressStatus.mockReturnValue(false); // Completed is not in progress (will show empty state)

      // To test this properly, we need at least one step execution so it doesn't show empty state
      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
        stepType: 'log',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'log',
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'log',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      // buildStepExecutionsTree should be called with only existing step executions (no skeletons for terminal status)
      expect(buildStepExecutionsTree).toHaveBeenCalled();
      expect(buildStepExecutionsTree).toHaveBeenCalledWith(
        [stepExecution],
        expect.objectContaining({}),
        'completed'
      );
      expect(isTerminalStatus).toHaveBeenCalledWith(ExecutionStatus.COMPLETED);
    });
  });

  describe('step selection', () => {
    it('should highlight selected step', () => {
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId="step-exec-1"
          />
        </TestWrapper>
      );

      const label = screen.getByTestId('step-execution-tree-item-label');
      expect(label).toHaveAttribute('data-selected', 'true');
    });

    it('should call onStepExecutionClick when step label is clicked', async () => {
      const user = userEvent.setup();
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const label = screen.getByTestId('step-execution-tree-item-label');
      await user.click(label);

      await waitFor(() => {
        expect(mockOnStepExecutionClick).toHaveBeenCalledWith('step-exec-1');
      });
    });

    it('should call onStepExecutionClick when step icon is clicked', async () => {
      const user = userEvent.setup();
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const icon = screen.getByTestId('step-icon');
      await user.click(icon);

      await waitFor(() => {
        expect(mockOnStepExecutionClick).toHaveBeenCalledWith('step-exec-1');
      });
    });
  });

  describe('missing definition state', () => {
    it('should display error when definition is null', () => {
      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [createMockStepExecution()],
      });

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={null}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('Error loading execution graph')).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });
  });

  describe('tree interaction', () => {
    it('should handle tree node expansion/collapse', async () => {
      const user = userEvent.setup();
      isTerminalStatus.mockReturnValue(true);

      const parentStepExecution = createMockStepExecution({
        id: 'parent-exec',
        stepId: 'parent-step',
        stepType: 'foreach',
      });

      const childStepExecution = createMockStepExecution({
        id: 'child-exec',
        stepId: 'child-step',
        stepType: 'action',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [parentStepExecution, childStepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'parent-step',
            type: 'foreach',
            foreach: 'item',
            steps: [
              {
                name: 'child-step',
                type: 'log',
              },
            ],
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'parent-exec',
          stepId: 'parent-step',
          stepType: 'foreach',
          executionIndex: 0,
          children: [
            {
              stepExecutionId: 'child-exec',
              stepId: 'child-step',
              stepType: 'action',
              executionIndex: 0,
              children: [],
            },
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      // Find the expand/collapse button for the parent node
      const expandButton = screen.getAllByRole('button')[0];
      await user.click(expandButton);

      await waitFor(() => {
        expect(mockOnStepExecutionClick).toHaveBeenCalledWith('parent-exec');
      });
    });

    it('should handle tree node without stepExecutionId but with children', async () => {
      const user = userEvent.setup();
      isTerminalStatus.mockReturnValue(true);

      const childStepExecution = createMockStepExecution({
        id: 'child-exec',
        stepId: 'child-step',
        stepType: 'action',
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [childStepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'parent-step',
            type: 'foreach',
            foreach: 'item',
            steps: [
              {
                name: 'child-step',
                type: 'log',
              },
            ],
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: null,
          stepId: 'parent-step',
          stepType: 'foreach',
          executionIndex: 0,
          children: [
            {
              stepExecutionId: 'child-exec',
              stepId: 'child-step',
              stepType: 'action',
              executionIndex: 0,
              children: [],
            },
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      // Find the expand/collapse button for the parent node
      const expandButton = screen.getAllByRole('button')[0];
      await user.click(expandButton);

      await waitFor(() => {
        // Should select the first child when parent has no stepExecutionId
        expect(mockOnStepExecutionClick).toHaveBeenCalledWith('child-exec');
      });
    });
  });

  describe('different execution statuses', () => {
    it('should apply correct styling for dangerous status', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
        status: ExecutionStatus.FAILED,
      });

      const execution = createMockExecution({
        status: ExecutionStatus.FAILED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(isDangerousStatus).toHaveBeenCalledWith(ExecutionStatus.FAILED);
      const label = screen.getByTestId('step-execution-tree-item-label');
      expect(label).toHaveAttribute('data-status', ExecutionStatus.FAILED);
    });
  });

  describe('step execution data', () => {
    it('should pass execution time to tree item label', () => {
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
        executionTimeMs: 3500,
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'action',
            with: { message: 'test' },
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const label = screen.getByTestId('step-execution-tree-item-label');
      expect(label).toHaveAttribute('data-execution-time-ms', '3500');
    });

    it('should handle missing execution time', () => {
      isTerminalStatus.mockReturnValue(true);

      const stepExecution = createMockStepExecution({
        id: 'step-exec-1',
        stepId: 'step-1',
        executionTimeMs: undefined,
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [stepExecution],
      });

      const definition = createMockDefinition({
        steps: [
          {
            name: 'step-1',
            type: 'log',
          },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'step-exec-1',
          stepId: 'step-1',
          stepType: 'log',
          executionIndex: 0,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={execution}
            definition={definition}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const label = screen.getByTestId('step-execution-tree-item-label');
      // When execution time is undefined, the attribute should not be set
      expect(label).not.toHaveAttribute('data-execution-time-ms');
    });
  });
});
