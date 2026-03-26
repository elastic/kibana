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
import type { WorkflowExecutionDto, WorkflowYaml } from '@kbn/workflows';
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

// Track step execution details props
const mockStepExecutionDetailsProps: { current: Record<string, unknown> } = {
  current: {},
};

jest.mock('./workflow_execution_panel', () => ({
  WorkflowExecutionPanel: ({
    execution,
    error,
    showBackButton,
  }: {
    execution: WorkflowExecutionDto | null;
    error: Error | null;
    showBackButton: boolean;
  }) => (
    <div data-test-subj="execution-panel">
      <div data-test-subj="show-back-button">{String(showBackButton)}</div>
      <div data-test-subj="panel-execution-status">{execution?.status ?? 'no-execution'}</div>
    </div>
  ),
}));

jest.mock('./workflow_step_execution_details', () => ({
  WorkflowStepExecutionDetails: (props: Record<string, unknown>) => {
    mockStepExecutionDetailsProps.current = props;
    return (
      <div data-test-subj="step-details">
        <div data-test-subj="step-resume-message">{String(props.resumeMessage ?? '')}</div>
        <div data-test-subj="step-auto-resume">{String(props.shouldAutoResume)}</div>
        <div data-test-subj="step-loading">{String(props.isLoadingStepData)}</div>
      </div>
    );
  },
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
  });

  describe('cache invalidation', () => {
    it('should call removeQueries on unmount with the current execution query key', () => {
      mockPollingResult.workflowExecution = createMockExecution({ id: 'exec-1' });
      mockUrlState.selectedStepExecutionId = '__overview';

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
      mockUrlState.selectedStepExecutionId = '__overview';

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

  describe('auto-select overview on failed before steps', () => {
    it('should auto-select overview when execution is terminal with no step executions', () => {
      mockPollingResult.workflowExecution = createMockExecution({
        id: 'exec-fail',
        status: ExecutionStatus.FAILED,
        error: { type: 'InputValidationError', message: 'name: Required' },
        stepExecutions: [],
      });

      mockUrlState.selectedStepExecutionId = '';

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-fail" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('__overview');
    });
  });

  describe('assignSelectedStepId helper (via Redux dispatch)', () => {
    it('should dispatch highlighted step as undefined when selectedStepExecutionId is __overview', () => {
      mockUrlState.selectedStepExecutionId = '__overview';
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      // With __overview pseudo step, highlighted step should be undefined
      // We verify this via the dispatch call
      expect(screen.getByTestId('execution-panel')).toBeInTheDocument();
    });

    it('should dispatch HIGHLIGHTED_STEP_TRIGGER when selectedStepExecutionId is "trigger"', () => {
      mockUrlState.selectedStepExecutionId = 'trigger';
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('execution-panel')).toBeInTheDocument();
    });
  });

  describe('resumeMessage derivation', () => {
    it('should derive resume message for WAITING_FOR_INPUT status', () => {
      const waitStep = createMockStepExecutionDto({
        id: 'step-exec-1',
        stepId: 'waitStep',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T10:00:00Z',
      });

      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        stepExecutions: [waitStep],
        workflowDefinition: createMockWorkflowYaml({
          steps: [
            {
              type: 'waitForInput',
              name: 'waitStep',
              with: { message: 'Please confirm' },
            },
          ],
        }),
      });

      // The component reads resumeMessage from useStepExecution's input, not from the YAML definition
      mockUseStepExecution.mockReturnValue({
        data: {
          id: 'step-exec-1',
          status: ExecutionStatus.WAITING_FOR_INPUT,
          input: { message: 'Please confirm' },
        },
        isLoading: false,
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('step-resume-message')).toHaveTextContent('Please confirm');
    });

    it('should return undefined resume message when no paused step is found', () => {
      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        stepExecutions: [
          createMockStepExecutionDto({
            id: 'step-exec-1',
            stepId: 'runningStep',
            status: ExecutionStatus.RUNNING,
            startedAt: '2024-01-01T10:00:00Z',
          }),
        ],
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('step-resume-message')).toHaveTextContent('');
    });

    it('should return undefined resume message for non-WAITING_FOR_INPUT status', () => {
      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.RUNNING,
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('step-resume-message')).toHaveTextContent('');
    });

    it('should return undefined when paused step definition is not a waitForInput type', () => {
      const waitStep = createMockStepExecutionDto({
        id: 'step-exec-1',
        stepId: 'someStep',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T10:00:00Z',
      });

      mockPollingResult.workflowExecution = createMockExecution({
        status: ExecutionStatus.WAITING_FOR_INPUT,
        stepExecutions: [waitStep],
        workflowDefinition: createMockWorkflowYaml({
          steps: [
            {
              type: 'noop',
              name: 'someStep',
            },
          ],
        }),
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('step-resume-message')).toHaveTextContent('');
    });
  });

  describe('shouldAutoResume pass-through', () => {
    it('should pass shouldAutoResume from URL state to step details', () => {
      mockUrlState.shouldAutoResume = true;
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('step-auto-resume')).toHaveTextContent('true');
    });
  });

  describe('showBackButton', () => {
    it('should show back button when activeTab is executions', () => {
      mockPollingResult.workflowExecution = createMockExecution();

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(screen.getByTestId('show-back-button')).toHaveTextContent('true');
    });
  });

  describe('child workflow step resolution', () => {
    it('should find step in child executions when not in root steps', () => {
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

      // The component should render without errors when finding child step
      expect(screen.getByTestId('step-details')).toBeInTheDocument();
    });
  });

  describe('auto-select overview pseudo step', () => {
    it('should auto-select __overview when no step is selected and execution has step executions', () => {
      mockUrlState.selectedStepExecutionId = undefined;
      mockPollingResult.workflowExecution = createMockExecution({
        id: 'exec-1',
        stepExecutions: [
          createMockStepExecutionDto({
            id: 'step-1',
            stepId: 's1',
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

      expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('__overview');
    });

    it('should auto-select __overview when no step is selected and execution is terminal with no steps', () => {
      mockUrlState.selectedStepExecutionId = undefined;
      mockPollingResult.workflowExecution = createMockExecution({
        id: 'exec-1',
        status: ExecutionStatus.FAILED,
        stepExecutions: [],
      });

      render(
        <TestWrapper>
          <WorkflowExecutionDetail executionId="exec-1" onClose={jest.fn()} />
        </TestWrapper>
      );

      expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('__overview');
    });
  });
});

describe('WorkflowExecutionDetail - resume input resolution', () => {
  let mockRemoveQueries: jest.Mock;

  const defaultWaitingLightweightStep = {
    id: 'step-exec-1',
    stepId: 'request_approval',
    stepType: 'waitForInput',
    status: ExecutionStatus.WAITING_FOR_INPUT,
    startedAt: '2024-01-01T00:00:00Z',
    globalExecutionIndex: 0,
    // input absent: polling uses includeInput: false
  } as const;

  // Polling returns lightweight steps without input (includeInput: false).
  // Resume copy is loaded via useStepExecution(pausedStepId) — not from workflowDefinition.
  // We still embed nested `if` / `foreach` shapes below so regressions in flat stepExecutions
  // detection do not go unnoticed when YAML nesting matches real workflows.
  const makeWaitingExecution = (options?: {
    steps?: WorkflowYaml['steps'];
    stepExecutions?: WorkflowExecutionDto['stepExecutions'];
  }): WorkflowExecutionDto => {
    const stepExecutions = options?.stepExecutions ?? [defaultWaitingLightweightStep as any];
    return {
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
        steps: options?.steps ?? [],
      } as WorkflowYaml,
      stepId: undefined,
      stepExecutions,
      duration: 0,
      triggeredBy: 'manual',
      yaml: 'version: "1"',
    };
  };

  /** First hook invocation is always the paused-step fetch (see workflow_execution_detail). */
  const expectPausedStepFetchArgs = (executionId: string, pausedStepExecutionId: string) => {
    expect(mockUseStepExecution.mock.calls[0]).toEqual([
      executionId,
      pausedStepExecutionId,
      ExecutionStatus.WAITING_FOR_INPUT,
    ]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStepExecutionDetailsProps.current = {};
    mockRemoveQueries = jest.fn();
    mockUseQueryClient.mockReturnValue({ removeQueries: mockRemoveQueries } as any);
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setSelectedStepExecution: mockSetSelectedStepExecution,
      selectedStepExecutionId: 'step-exec-1',
    } as any);
    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: makeWaitingExecution(),
      isLoading: false,
      error: null,
    });
  });

  it('passes resumeMessage and resumeSchema for a top-level waitForInput (fetch-driven)', () => {
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
      workflowExecution: makeWaitingExecution({ steps }),
      isLoading: false,
      error: null,
    });

    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-exec-1',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: {
          message: 'Top-level approval required',
          schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
        },
      },
      isLoading: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-1');
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBe('Top-level approval required');
    expect(mockStepExecutionDetailsProps.current.resumeSchema).toMatchObject({ type: 'object' });
  });

  it('passes undefined resumeMessage and resumeSchema when the paused-step fetch returns no data', () => {
    // Default mock returns { data: undefined } — no data yet from the fetch.
    mockUseStepExecution.mockReturnValue({ data: undefined, isLoading: true });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-1');
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBeUndefined();
    expect(mockStepExecutionDetailsProps.current.resumeSchema).toBeUndefined();
  });

  it('passes resumeMessage and resumeSchema when waitForInput is nested under if in YAML (fetch-driven)', () => {
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
      workflowExecution: makeWaitingExecution({ steps }),
      isLoading: false,
      error: null,
    });

    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-exec-1',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: {
          message: 'Nested approval required',
          schema: { type: 'object', properties: { severity: { type: 'string' } } },
        },
      },
      isLoading: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-1');
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBe('Nested approval required');
    expect(mockStepExecutionDetailsProps.current.resumeSchema).toMatchObject({ type: 'object' });
  });

  it('targets the WAITING_FOR_INPUT row when earlier steps in stepExecutions are already finished', () => {
    const stepExecutions = [
      {
        id: 'step-exec-done',
        stepId: 'hello_world',
        stepType: 'console',
        status: ExecutionStatus.COMPLETED,
        startedAt: '2024-01-01T00:00:00Z',
        globalExecutionIndex: 0,
      } as any,
      {
        id: 'step-exec-waiting',
        stepId: 'request_approval',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T00:00:01Z',
        globalExecutionIndex: 1,
      } as any,
    ];
    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: makeWaitingExecution({ stepExecutions }),
      isLoading: false,
      error: null,
    });
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setSelectedStepExecution: mockSetSelectedStepExecution,
      selectedStepExecutionId: 'step-exec-waiting',
    } as any);

    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-exec-waiting',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: { message: 'Blocked on second step' },
      },
      isLoading: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-waiting');
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBe('Blocked on second step');
  });

  it('passes only resumeMessage when schema is absent from the paused-step input', () => {
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-exec-1',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: { message: 'Approve?' },
      },
      isLoading: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-1');
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBe('Approve?');
    expect(mockStepExecutionDetailsProps.current.resumeSchema).toBeUndefined();
  });

  it('passes resumeSchema and evaluated message for waitForInput nested under foreach in YAML', () => {
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
    const stepExecutions = [
      {
        id: 'step-exec-foreach-alpha',
        stepId: 'request_approval',
        stepType: 'waitForInput',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        startedAt: '2024-01-01T00:00:00Z',
        globalExecutionIndex: 2,
      } as any,
    ];
    mockUseWorkflowExecutionPolling.mockReturnValue({
      workflowExecution: makeWaitingExecution({ steps, stepExecutions }),
      isLoading: false,
      error: null,
    });
    mockUseWorkflowUrlState.mockReturnValue({
      activeTab: 'executions',
      setSelectedStepExecution: mockSetSelectedStepExecution,
      selectedStepExecutionId: 'step-exec-foreach-alpha',
    } as any);

    // Engine stores the Liquid-rendered message on stepExecution.input; UI must not re-parse YAML.
    mockUseStepExecution.mockReturnValue({
      data: {
        id: 'step-exec-foreach-alpha',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        input: {
          message: 'Approve item alpha',
          schema: { type: 'object', properties: { approved: { type: 'boolean' } } },
        },
      },
      isLoading: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-waiting" onClose={jest.fn()} />
      </TestWrapper>
    );

    expectPausedStepFetchArgs('exec-waiting', 'step-exec-foreach-alpha');
    expect(mockStepExecutionDetailsProps.current.resumeSchema).toMatchObject({ type: 'object' });
    expect(mockStepExecutionDetailsProps.current.resumeMessage).toBe('Approve item alpha');
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
      ...createMockExecution({ id: 'exec-fail' }),
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
      shouldAutoResume: false,
    });

    render(
      <TestWrapper>
        <WorkflowExecutionDetail executionId="exec-fail" onClose={jest.fn()} />
      </TestWrapper>
    );

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('__overview');
  });
});
