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
  injectChildWorkflowSteps: jest.fn((tree) => ({ tree, childStepExecutions: [] })),
}));

jest.mock('../../lib/use_error_panel_diagnose_availability', () => ({
  useErrorPanelDiagnoseAvailability: () => ({
    state: 'd',
    rawState: 'd',
    requiredLicenseTier: 'enterprise',
    diagnoseFeatureEnabled: false,
    isDiagnoseHandoffInFlight: false,
    openDiagnose: jest.fn(),
    openLicenseManagement: jest.fn(),
    licenseManagementHref: '/app/management/license_management',
  }),
}));

// Mock child components
jest.mock('../step_execution_tree_row', () => ({
  TREE_ROW_CHEVRON_SLOT_PX: 16,
  TREE_ROW_GAP_SIZE: 's',
  TREE_ROW_PADDING_X_SIZE: 's',
  TREE_INDENT_GUIDE_STANDOFF_PX: 2,
  TREE_INDENT_GUIDE_WIDTH_PX: 1.5,
  getTreeIndentGuideOffset: (paddingX: string) => `calc(${paddingX} + 8px)`,
  StepExecutionTreeRow: ({
    stepId,
    stepType,
    selected,
    status,
    executionTimeMs,
    usage,
    iterationPinKinds,
    stateTags,
    isExpandable,
    isExpanded,
    isBranchLabel,
    attemptNumber,
    isRetryAttempt,
    retryAttemptCount,
    retryMaxAttempts,
    reserveChevronSlot,
    error,
    errorPanelMessageOverride,
    errorPanelAriaLabel,
    showAggregateDanger,
    showDangerSelectionBorder,
    arrivalPulse,
    onSelect,
    onToggleExpand,
    'data-test-subj': dataTestSubj = 'step-execution-tree-item-label',
  }: {
    stepId: string;
    stepType?: string;
    selected: boolean;
    status?: ExecutionStatus;
    executionTimeMs?: number | null;
    usage?: { totalTokens: number } | null;
    iterationPinKinds?: string[];
    stateTags?: string[];
    isExpandable?: boolean;
    isExpanded?: boolean;
    isBranchLabel?: boolean;
    attemptNumber?: number;
    isRetryAttempt?: boolean;
    retryAttemptCount?: number;
    retryMaxAttempts?: number;
    reserveChevronSlot?: boolean;
    error?: unknown;
    errorPanelMessageOverride?: string;
    errorPanelAriaLabel?: string;
    showAggregateDanger?: boolean;
    showDangerSelectionBorder?: boolean;
    arrivalPulse?: boolean;
    onSelect: () => void;
    onToggleExpand?: () => void;
    'data-test-subj'?: string;
  }) => (
    <span
      data-test-subj={dataTestSubj}
      data-step-id={stepId}
      data-step-type={stepType}
      data-selected={selected}
      data-status={status}
      data-execution-time-ms={executionTimeMs}
      data-attempt-number={attemptNumber}
      data-is-retry-attempt={isRetryAttempt ? 'true' : 'false'}
      data-retry-attempt-count={retryAttemptCount}
      data-reserve-chevron-slot={reserveChevronSlot === false ? 'false' : 'true'}
      data-pin-kinds={(iterationPinKinds ?? []).join(',')}
      data-state-tags={(stateTags ?? []).join(',')}
      data-is-expandable={isExpandable ? 'true' : 'false'}
      data-is-expanded={isExpanded ? 'true' : 'false'}
      data-is-branch-label={isBranchLabel ? 'true' : 'false'}
      data-show-aggregate-danger={showAggregateDanger ? 'true' : 'false'}
      data-has-error-panel={error ? 'true' : 'false'}
      data-error-lead-in={errorPanelMessageOverride ?? ''}
      data-error-aria-label={errorPanelAriaLabel ?? ''}
      data-danger-fill={
        status === 'failed' && (!isRetryAttempt || (stateTags ?? []).includes('final'))
          ? 'true'
          : 'false'
      }
      data-danger-selected={showDangerSelectionBorder ? 'true' : 'false'}
      data-arrival-pulse={arrivalPulse ? 'true' : 'false'}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect();
        }
      }}
    >
      {isExpandable ? (
        <button
          type="button"
          data-test-subj="workflowStepTreeChevron"
          aria-expanded={isExpanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
        />
      ) : null}
      {isBranchLabel ? <span data-test-subj="workflowStepTreeBranchGlyph">{'→'}</span> : null}
      <span data-test-subj="workflowStepName">
        {attemptNumber !== undefined ? `#${attemptNumber} ` : null}
        {stepId}
      </span>
      {retryAttemptCount != null && retryAttemptCount > 0 && !isRetryAttempt ? (
        <span data-test-subj="workflowStepTreeAttemptsBadge">
          {retryMaxAttempts != null
            ? `${retryAttemptCount} of ${retryMaxAttempts} attempts`
            : `${retryAttemptCount} attempts`}
        </span>
      ) : null}
      {(iterationPinKinds ?? []).map((kind) => (
        <span key={kind} data-test-subj={`workflowStepTreeIterationTag-${kind}`}>
          {kind}
        </span>
      ))}
      {(stateTags ?? []).map((kind) => (
        <span key={`state-${kind}`} data-test-subj={`workflowStepTreeIterationTag-${kind}`}>
          {kind}
        </span>
      ))}
      {error && (!isRetryAttempt || (stateTags ?? []).includes('final')) ? (
        <span data-test-subj="workflowFailedStepErrorPanel" aria-label={errorPanelAriaLabel}>
          {errorPanelMessageOverride ?? 'error'}
        </span>
      ) : null}
      {usage && usage.totalTokens > 0 ? (
        <span data-test-subj="workflowStepTreeTokenUsage">{usage.totalTokens}</span>
      ) : null}
      {status === 'skipped' || status === 'pending' ? (
        <span data-test-subj="workflowStepTreeDuration">{'Not run'}</span>
      ) : null}
    </span>
  ),
}));

jest.mock('../iteration_gap_row', () => ({
  IterationGapRow: ({
    from,
    to,
    count,
    isExpanded,
    onToggle,
  }: {
    from: number;
    to: number;
    count: number;
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      data-test-subj="workflowStepExecutionTreeIterationGap"
      data-gap-from={from}
      data-gap-to={to}
      data-gap-count={count}
      data-gap-expanded={isExpanded ? 'true' : 'false'}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {isExpanded ? `Hide iterations #${from}–#${to}` : `Show ${count} more iterations`}
    </button>
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
        screen.getByRole('tree', { name: 'Workflow step execution tree' })
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
        'completed',
        undefined
      );
      expect(
        screen.getByRole('tree', { name: 'Workflow step execution tree' })
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
        'completed',
        undefined
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

    it('should call onStepExecutionClick when step row is clicked', async () => {
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

      const row = screen.getByTestId('step-execution-tree-item-label');
      await user.click(row);

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

      // Select the parent row (no stepExecutionId) — falls back to first child.
      const parentLabel = screen.getByText('parent-step');
      await user.click(parentLabel);

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

  describe('failed before steps', () => {
    it('should render skeleton steps when execution failed before any steps ran', () => {
      isTerminalStatus.mockReturnValue(true);
      isInProgressStatus.mockReturnValue(false);

      const execution = createMockExecution({
        status: ExecutionStatus.FAILED,
        stepExecutions: [],
        error: { type: 'InputValidationError', message: 'name: Required' },
        triggeredBy: 'manual',
      });

      const definition = createMockDefinition({
        steps: [
          { name: 'step-1', type: 'action', with: { message: 'test' } },
          { name: 'step-2', type: 'http', with: { url: 'http://example.com' } },
        ],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: '__overview',
          stepId: 'Overview',
          stepType: '__overview',
          executionIndex: 0,
          children: [],
        },
        {
          stepExecutionId: 'trigger',
          stepId: 'Inputs',
          stepType: '__inputs',
          executionIndex: 0,
          isTriggerPseudoStep: true,
          children: [],
        },
        {
          stepExecutionId: 'skeleton-step-1-action-0',
          stepId: 'step-1',
          stepType: 'action',
          executionIndex: 0,
          children: [],
        },
        {
          stepExecutionId: 'skeleton-step-2-http-1',
          stepId: 'step-2',
          stepType: 'http',
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
        screen.getByRole('tree', { name: 'Workflow step execution tree' })
      ).toBeInTheDocument();

      const labels = screen.getAllByTestId('step-execution-tree-item-label');
      expect(labels.length).toBeGreaterThanOrEqual(2);
    });

    it('should pass triggeredBy to buildStepExecutionsTree', () => {
      isTerminalStatus.mockReturnValue(true);
      isInProgressStatus.mockReturnValue(false);

      const execution = createMockExecution({
        status: ExecutionStatus.FAILED,
        stepExecutions: [],
        triggeredBy: 'manual',
      });

      const definition = createMockDefinition({
        steps: [{ name: 'step-1', type: 'action', with: { message: 'test' } }],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: '__overview',
          stepId: 'Overview',
          stepType: '__overview',
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
        expect.any(Array),
        undefined,
        ExecutionStatus.FAILED,
        'manual'
      );
    });
  });

  describe('token usage badges', () => {
    it('does not render a token badge on a control-flow step whose subtree has no AI usage', () => {
      isTerminalStatus.mockReturnValue(true);

      const ifStep = createMockStepExecution({
        id: 'if-exec',
        stepId: 'check_condition',
        stepType: 'if',
        usage: undefined,
      });
      const consoleStep = createMockStepExecution({
        id: 'console-exec',
        stepId: 'log_message',
        stepType: 'console',
        usage: undefined,
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [ifStep, consoleStep],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'if-exec',
          stepId: 'check_condition',
          stepType: 'if',
          executionIndex: 0,
          children: [
            {
              stepExecutionId: 'console-exec',
              stepId: 'log_message',
              stepType: 'console',
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
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('workflowStepTreeTokenUsage')).not.toBeInTheDocument();
    });

    it('renders an abbreviated token badge when a control-flow subtree has non-zero AI usage', () => {
      isTerminalStatus.mockReturnValue(true);

      const ifStep = createMockStepExecution({
        id: 'if-exec',
        stepId: 'check_condition',
        stepType: 'if',
      });
      const aiStep = createMockStepExecution({
        id: 'ai-exec',
        stepId: 'ask_model',
        stepType: 'ai.prompt',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      });

      const execution = createMockExecution({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [ifStep, aiStep],
      });

      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'if-exec',
          stepId: 'check_condition',
          stepType: 'if',
          executionIndex: 0,
          children: [
            {
              stepExecutionId: 'ai-exec',
              stepId: 'ask_model',
              stepType: 'ai.prompt',
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
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const badges = screen.getAllByTestId('workflowStepTreeTokenUsage');
      expect(badges.length).toBeGreaterThanOrEqual(1);
      expect(badges.some((el) => el.textContent === '15')).toBe(true);
    });
  });

  describe('foreach iteration pins and gaps', () => {
    const makeIteration = (index: number, stepExecId: string) => ({
      stepExecutionId: null as string | null,
      stepId: String(index),
      stepType: 'foreach-iteration',
      executionIndex: index,
      children: [
        {
          stepExecutionId: stepExecId,
          stepId: 'log',
          stepType: 'console',
          executionIndex: index,
          children: [],
        },
      ],
    });

    it('renders three peer iteration rows with no gaps when count is below the threshold', () => {
      isTerminalStatus.mockReturnValue(true);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          executionIndex: 0,
          children: [
            makeIteration(0, 'step-0'),
            makeIteration(1, 'step-1'),
            makeIteration(2, 'step-2'),
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'foreach-exec',
                  stepId: 'loop',
                  stepType: 'foreach',
                }),
                createMockStepExecution({ id: 'step-0', stepId: 'log', stepType: 'console' }),
                createMockStepExecution({ id: 'step-1', stepId: 'log', stepType: 'console' }),
                createMockStepExecution({ id: 'step-2', stepId: 'log', stepType: 'console' }),
              ],
            })}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('workflowStepExecutionTreeIterationGap')).not.toBeInTheDocument();
      expect(screen.getByText('Iteration #0')).toBeInTheDocument();
      expect(screen.getByText('Iteration #1')).toBeInTheDocument();
      expect(screen.getByText('Iteration #2')).toBeInTheDocument();
    });

    it('pins a mid-loop failure between gaps and the latest (50/#46 scenario shape)', async () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation(
        (status: ExecutionStatus) => status === ExecutionStatus.FAILED
      );
      const children = Array.from({ length: 6 }, (_, i) => makeIteration(i, `step-${i}`));
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          executionIndex: 0,
          children,
        },
      ]);

      const stepExecutions = [
        createMockStepExecution({ id: 'foreach-exec', stepId: 'loop', stepType: 'foreach' }),
        ...Array.from({ length: 6 }, (_, i) =>
          createMockStepExecution({
            id: `step-${i}`,
            stepId: 'log',
            stepType: 'console',
            status: i === 2 ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
            executionTimeMs: 10,
          })
        ),
      ];

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions,
            })}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const gaps = screen.getAllByTestId('workflowStepExecutionTreeIterationGap');
      expect(gaps).toHaveLength(2);
      expect(gaps[0]).toHaveAttribute('data-gap-from', '0');
      expect(gaps[0]).toHaveAttribute('data-gap-to', '1');
      expect(gaps[1]).toHaveAttribute('data-gap-from', '3');
      expect(gaps[1]).toHaveAttribute('data-gap-to', '4');

      expect(screen.getByText('Iteration #2')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepTreeIterationTag-failed')).toBeInTheDocument();
      expect(screen.getByText('Iteration #5')).toBeInTheDocument();
      expect(screen.getByTestId('workflowStepTreeIterationTag-latest')).toBeInTheDocument();

      const failedRow = screen
        .getByText('Iteration #2')
        .closest('[data-test-subj="step-execution-tree-item-label"]');
      expect(failedRow).toHaveAttribute('data-is-expanded', 'true');

      const latestRow = screen
        .getByText('Iteration #5')
        .closest('[data-test-subj="step-execution-tree-item-label"]');
      expect(latestRow).toHaveAttribute('data-is-expanded', 'false');

      const user = userEvent.setup();
      await user.click(gaps[0]);
      await waitFor(() => {
        expect(screen.getByText('Iteration #0')).toBeInTheDocument();
        expect(screen.getByText('Iteration #1')).toBeInTheDocument();
      });
      expect(screen.getAllByTestId('workflowStepExecutionTreeIterationGap')[1]).toHaveAttribute(
        'data-gap-expanded',
        'false'
      );
    });

    it('pins the in-flight iteration with a running tag while execution is active', () => {
      isTerminalStatus.mockReturnValue(false);
      isInProgressStatus.mockReturnValue(true);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          executionIndex: 0,
          children: Array.from({ length: 6 }, (_, i) => makeIteration(i, `step-${i}`)),
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.RUNNING,
              stepExecutions: [
                createMockStepExecution({
                  id: 'foreach-exec',
                  stepId: 'loop',
                  stepType: 'foreach',
                  status: ExecutionStatus.RUNNING,
                }),
                ...Array.from({ length: 6 }, (_, i) =>
                  createMockStepExecution({
                    id: `step-${i}`,
                    stepId: 'log',
                    stepType: 'console',
                    status: i < 5 ? ExecutionStatus.COMPLETED : ExecutionStatus.RUNNING,
                    executionTimeMs: 10,
                  })
                ),
              ],
            })}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('workflowStepTreeIterationTag-running')).toBeInTheDocument();
      expect(screen.queryByTestId('workflowStepTreeIterationTag-latest')).not.toBeInTheDocument();
    });

    it('derives completed status for iterations with executed steps (no Not run)', () => {
      isTerminalStatus.mockReturnValue(true);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          executionIndex: 0,
          children: [
            makeIteration(0, 'step-0'),
            makeIteration(1, 'step-1'),
            makeIteration(2, 'step-2'),
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'foreach-exec',
                  stepId: 'loop',
                  stepType: 'foreach',
                }),
                createMockStepExecution({
                  id: 'step-0',
                  stepId: 'log',
                  stepType: 'console',
                  status: ExecutionStatus.COMPLETED,
                }),
                createMockStepExecution({
                  id: 'step-1',
                  stepId: 'log',
                  stepType: 'console',
                  status: ExecutionStatus.COMPLETED,
                }),
                createMockStepExecution({
                  id: 'step-2',
                  stepId: 'log',
                  stepType: 'console',
                  status: ExecutionStatus.COMPLETED,
                }),
              ],
            })}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const iterationRows = screen
        .getAllByTestId('step-execution-tree-item-label')
        .filter((el) => el.getAttribute('data-step-type') === 'foreach-iteration');
      expect(iterationRows).toHaveLength(3);
      for (const row of iterationRows) {
        expect(row).toHaveAttribute('data-status', ExecutionStatus.COMPLETED);
        expect(row).not.toHaveTextContent('Not run');
      }
    });

    it('makes iteration rows hoverable, focusable, and clickable to open the iteration subflyout', async () => {
      const user = userEvent.setup();
      isTerminalStatus.mockReturnValue(true);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'foreach-exec',
          stepId: 'loop',
          stepType: 'foreach',
          executionIndex: 0,
          children: [makeIteration(0, 'step-0')],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'foreach-exec',
                  stepId: 'loop',
                  stepType: 'foreach',
                }),
                createMockStepExecution({
                  id: 'step-0',
                  stepId: 'log',
                  stepType: 'console',
                  status: ExecutionStatus.COMPLETED,
                }),
              ],
            })}
            definition={createMockDefinition()}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const iterationRow = screen.getByText('Iteration #0').closest('[role="button"]');
      expect(iterationRow).not.toBeNull();
      expect(iterationRow).toHaveAttribute('tabIndex', '0');

      await user.click(iterationRow!);
      expect(mockOnStepExecutionClick).toHaveBeenCalledWith('foreach-iteration:loop:0');
    });
  });

  describe('definition-merged Not run rows', () => {
    it('ghosts subsequent definition steps after a halt, in definition order', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation((s) => s === ExecutionStatus.FAILED);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'start-id',
          stepId: 'start',
          stepType: 'console',
          executionIndex: 0,
          status: ExecutionStatus.COMPLETED,
          children: [],
        },
        {
          stepExecutionId: null,
          stepId: 'triage_overview',
          stepType: 'ai.prompt',
          executionIndex: 1,
          status: ExecutionStatus.FAILED,
          retryAttemptCount: 2,
          children: [
            {
              stepExecutionId: 'attempt-1',
              stepId: 'triage_overview',
              stepType: 'ai.prompt',
              executionIndex: 0,
              status: ExecutionStatus.FAILED,
              attemptNumber: 1,
              isFinalAttempt: false,
              isRetryAttempt: true,
              children: [],
            },
            {
              stepExecutionId: 'attempt-2',
              stepId: 'triage_overview',
              stepType: 'ai.prompt',
              executionIndex: 1,
              status: ExecutionStatus.FAILED,
              attemptNumber: 2,
              isFinalAttempt: true,
              isRetryAttempt: true,
              children: [],
            },
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.FAILED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'start-id',
                  stepId: 'start',
                  status: ExecutionStatus.COMPLETED,
                }),
                createMockStepExecution({
                  id: 'attempt-1',
                  stepId: 'triage_overview',
                  status: ExecutionStatus.FAILED,
                  error: { type: 'Error', message: 'e1' },
                }),
                createMockStepExecution({
                  id: 'attempt-2',
                  stepId: 'triage_overview',
                  status: ExecutionStatus.FAILED,
                  error: { type: 'Error', message: 'e2' },
                }),
              ],
            })}
            definition={createMockDefinition({
              steps: [
                { name: 'start', type: 'console' },
                { name: 'triage_overview', type: 'ai.prompt' },
                { name: 'process_alerts', type: 'foreach' },
                { name: 'final_summary', type: 'console' },
                { name: 'done', type: 'console' },
              ] as WorkflowYaml['steps'],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      const names = screen.getAllByTestId('workflowStepName').map((el) => el.textContent);
      expect(names).toEqual([
        'start',
        'triage_overview',
        'Attempt #1',
        'Attempt #2',
        'process_alerts',
        'final_summary',
        'done',
      ]);
      expect(screen.getAllByText('Not run')).toHaveLength(3);
      const foreachRow = screen.getByText('process_alerts').closest('[data-is-expandable]');
      expect(foreachRow).toHaveAttribute('data-is-expandable', 'false');
      expect(foreachRow).toHaveAttribute('data-status', ExecutionStatus.SKIPPED);
    });

    it('does not ghost later steps that actually ran (on-failure: continue)', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation((s) => s === ExecutionStatus.FAILED);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'a-id',
          stepId: 'a',
          stepType: 'console',
          executionIndex: 0,
          status: ExecutionStatus.FAILED,
          children: [],
        },
        {
          stepExecutionId: 'b-id',
          stepId: 'b',
          stepType: 'console',
          executionIndex: 1,
          status: ExecutionStatus.COMPLETED,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.FAILED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'a-id',
                  stepId: 'a',
                  status: ExecutionStatus.FAILED,
                  error: { type: 'Error', message: 'boom' },
                }),
                createMockStepExecution({
                  id: 'b-id',
                  stepId: 'b',
                  status: ExecutionStatus.COMPLETED,
                }),
              ],
            })}
            definition={createMockDefinition({
              steps: [
                { name: 'a', type: 'console' },
                { name: 'b', type: 'console' },
                { name: 'c', type: 'console' },
              ] as WorkflowYaml['steps'],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.getByText('b').closest('[data-status]')).toHaveAttribute(
        'data-status',
        ExecutionStatus.COMPLETED
      );
      expect(screen.getByText('c').closest('[data-status]')).toHaveAttribute(
        'data-status',
        ExecutionStatus.SKIPPED
      );
      expect(screen.getAllByText('Not run')).toHaveLength(1);
    });

    it('renders zero Not run rows for a fully successful execution', () => {
      isTerminalStatus.mockReturnValue(true);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: 'a-id',
          stepId: 'a',
          stepType: 'console',
          executionIndex: 0,
          status: ExecutionStatus.COMPLETED,
          children: [],
        },
        {
          stepExecutionId: 'b-id',
          stepId: 'b',
          stepType: 'console',
          executionIndex: 1,
          status: ExecutionStatus.COMPLETED,
          children: [],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions: [
                createMockStepExecution({ id: 'a-id', stepId: 'a' }),
                createMockStepExecution({ id: 'b-id', stepId: 'b' }),
              ],
            })}
            definition={createMockDefinition({
              steps: [
                { name: 'a', type: 'console' },
                { name: 'b', type: 'console' },
              ] as WorkflowYaml['steps'],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.queryByText('Not run')).not.toBeInTheDocument();
    });
  });

  describe('retry attempts', () => {
    const makeFailedRetryTree = () => [
      {
        stepExecutionId: null,
        stepId: 'http_call',
        stepType: 'kibana.request',
        executionIndex: 0,
        status: ExecutionStatus.FAILED,
        retryAttemptCount: 4,
        children: [1, 2, 3, 4].map((n) => ({
          stepExecutionId: `attempt-${n}`,
          stepId: 'http_call',
          stepType: 'kibana.request',
          executionIndex: n - 1,
          status: ExecutionStatus.FAILED,
          attemptNumber: n,
          isFinalAttempt: n === 4,
          isRetryAttempt: true,
          retryAttemptCount: 4,
          children: [],
        })),
      },
    ];

    it('renders parent with used-of-max badge, Attempt #N rows, waits, and one final error panel', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation((s) => s === ExecutionStatus.FAILED);
      buildStepExecutionsTree.mockReturnValue(makeFailedRetryTree());

      const t0 = Date.parse('2024-01-01T10:00:00.000Z');
      const stepExecutions = [1, 2, 3, 4].map((n) =>
        createMockStepExecution({
          id: `attempt-${n}`,
          stepId: 'http_call',
          stepType: 'kibana.request',
          status: ExecutionStatus.FAILED,
          startedAt: new Date(t0 + (n - 1) * 5000 + (n - 1) * 100).toISOString(),
          finishedAt: new Date(t0 + (n - 1) * 5000 + (n - 1) * 100 + 100).toISOString(),
          executionTimeMs: 100,
          error: { type: 'Error', message: `err-${n}` },
          scopeStack: [
            {
              stepId: 'http_call',
              nestedScopes: [
                {
                  nodeId: 'enterRetry_http_call',
                  nodeType: 'enter-retry',
                  scopeId: `${n}-attempt`,
                },
              ],
            },
          ],
        })
      );

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.FAILED,
              stepExecutions,
            })}
            definition={createMockDefinition({
              steps: [
                {
                  name: 'http_call',
                  type: 'kibana.request',
                  'on-failure': { retry: { 'max-attempts': 3, delay: '5s' } },
                } as WorkflowYaml['steps'][number],
              ],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
            autoExpandErrorForStepId="attempt-4"
          />
        </TestWrapper>
      );

      expect(screen.getByTestId('workflowStepTreeAttemptsBadge')).toHaveTextContent(
        '4 of 4 attempts'
      );
      expect(screen.getByText('Attempt #1')).toBeInTheDocument();
      expect(screen.getByText('Attempt #4')).toBeInTheDocument();
      // Leaf-only attempt group: no chevron gutter reservation.
      expect(screen.getByText('Attempt #1').closest('[data-reserve-chevron-slot]')).toHaveAttribute(
        'data-reserve-chevron-slot',
        'false'
      );
      expect(screen.getAllByTestId('workflowStepTreeRetryWait')).toHaveLength(3);
      expect(screen.getAllByTestId('workflowStepTreeRetryWait')[0]).toHaveAttribute(
        'data-reserve-chevron-slot',
        'false'
      );
      expect(screen.getAllByTestId('workflowFailedStepErrorPanel')).toHaveLength(1);
      expect(screen.getByTestId('workflowFailedStepErrorPanel')).toHaveTextContent(
        /All 4 attempts failed/
      );
      expect(screen.getByTestId('workflowStepTreeIterationTag-final')).toBeInTheDocument();

      const parent = screen.getByText('http_call').closest('[data-step-id="http_call"]');
      expect(parent).toHaveAttribute('data-retry-attempt-count', '4');
      expect(parent).toHaveAttribute('data-has-error-panel', 'false');
      expect(parent).toHaveAttribute('data-step-type', 'kibana.request');
    });

    it('borders the final-attempt error region when any attempt of the step is selected', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation((s) => s === ExecutionStatus.FAILED);
      buildStepExecutionsTree.mockReturnValue(makeFailedRetryTree());

      const stepExecutions = [1, 2, 3, 4].map((n) =>
        createMockStepExecution({
          id: `attempt-${n}`,
          stepId: 'http_call',
          stepType: 'kibana.request',
          status: ExecutionStatus.FAILED,
          error: { type: 'Error', message: `err-${n}` },
          scopeStack: [
            {
              stepId: 'http_call',
              nestedScopes: [
                {
                  nodeId: 'enterRetry_http_call',
                  nodeType: 'enter-retry',
                  scopeId: `${n}-attempt`,
                },
              ],
            },
          ],
        })
      );

      const { rerender } = render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.FAILED,
              stepExecutions,
            })}
            definition={createMockDefinition({
              steps: [
                {
                  name: 'http_call',
                  type: 'kibana.request',
                  'on-failure': { retry: { 'max-attempts': 3, delay: '5s' } },
                } as WorkflowYaml['steps'][number],
              ],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId="attempt-1"
          />
        </TestWrapper>
      );

      const bordered = document.querySelector('[data-danger-selected="true"]');
      expect(bordered).toBeTruthy();
      expect(bordered).toHaveAttribute('data-danger-fill', 'true');
      expect(bordered?.textContent).toMatch(/Attempt #4|All 4 attempts failed/);

      rerender(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.FAILED,
              stepExecutions,
            })}
            definition={createMockDefinition({
              steps: [
                {
                  name: 'http_call',
                  type: 'kibana.request',
                  'on-failure': { retry: { 'max-attempts': 3, delay: '5s' } },
                } as WorkflowYaml['steps'][number],
              ],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(document.querySelector('[data-danger-selected="true"]')).toBeNull();
      expect(document.querySelector('[data-danger-fill="true"]')).toBeTruthy();
    });

    it('shows recovered annotation and no error panel when retries eventually succeed', () => {
      isTerminalStatus.mockReturnValue(true);
      isDangerousStatus.mockImplementation((s) => s === ExecutionStatus.FAILED);
      buildStepExecutionsTree.mockReturnValue([
        {
          stepExecutionId: null,
          stepId: 'http_call',
          stepType: 'kibana.request',
          executionIndex: 0,
          status: ExecutionStatus.COMPLETED,
          retryAttemptCount: 2,
          retryRecovered: true,
          children: [
            {
              stepExecutionId: 'attempt-1',
              stepId: 'http_call',
              stepType: 'kibana.request',
              executionIndex: 0,
              status: ExecutionStatus.FAILED,
              attemptNumber: 1,
              isFinalAttempt: false,
              isRetryAttempt: true,
              retryAttemptCount: 2,
              children: [],
            },
            {
              stepExecutionId: 'attempt-2',
              stepId: 'http_call',
              stepType: 'kibana.request',
              executionIndex: 1,
              status: ExecutionStatus.COMPLETED,
              attemptNumber: 2,
              isFinalAttempt: true,
              isRetryAttempt: true,
              retryAttemptCount: 2,
              children: [],
            },
          ],
        },
      ]);

      render(
        <TestWrapper>
          <WorkflowStepExecutionTree
            execution={createMockExecution({
              status: ExecutionStatus.COMPLETED,
              stepExecutions: [
                createMockStepExecution({
                  id: 'attempt-1',
                  stepId: 'http_call',
                  status: ExecutionStatus.FAILED,
                  finishedAt: '2024-01-01T10:00:01Z',
                  error: { type: 'Error', message: 'temp' },
                }),
                createMockStepExecution({
                  id: 'attempt-2',
                  stepId: 'http_call',
                  status: ExecutionStatus.COMPLETED,
                  startedAt: '2024-01-01T10:00:06Z',
                  finishedAt: '2024-01-01T10:00:06.100Z',
                }),
              ],
            })}
            definition={createMockDefinition({
              steps: [
                {
                  name: 'http_call',
                  type: 'kibana.request',
                  'on-failure': { retry: { 'max-attempts': 3, delay: '5s' } },
                } as WorkflowYaml['steps'][number],
              ],
            })}
            error={null}
            onStepExecutionClick={mockOnStepExecutionClick}
            selectedId={null}
          />
        </TestWrapper>
      );

      expect(screen.queryByTestId('workflowFailedStepErrorPanel')).not.toBeInTheDocument();
      expect(screen.getByTestId('workflowStepTreeAttemptsBadge')).toHaveTextContent(
        '2 of 4 attempts'
      );
      expect(screen.getByTestId('workflowStepTreeIterationTag-recovered')).toBeInTheDocument();
      expect(screen.getByText('Attempt #2').closest('[data-state-tags]')).toHaveAttribute(
        'data-state-tags',
        'final'
      );
      expect(screen.getByTestId('workflowStepTreeRetryWait')).toBeInTheDocument();
    });
  });
});
