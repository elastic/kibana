/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Kept apart from workflow_execution_flyout.test.tsx: the step mocks below stub out the data the
 * loading-error tests in that file assert on.
 */

import { copyToClipboard } from '@elastic/eui';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(),
  };
});

jest.mock('../../../entities/workflows/model/use_workflow_execution_polling');

const mockSetSelectedStepExecution = jest.fn();
const mockUrlState: { selectedStepExecutionId: string | undefined } = {
  selectedStepExecutionId: undefined,
};

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => ({
    selectedStepExecutionId: mockUrlState.selectedStepExecutionId,
    setSelectedStepExecution: mockSetSelectedStepExecution,
  }),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({
    href: '/app/workflows/workflow-1?tab=executions&executionId=exec-1',
    navigate: jest.fn(),
  }),
}));

jest.mock('../model/use_step_execution', () => ({
  useStepExecution: () => ({
    data: {
      input: { host: 'web-1' },
      output: { result: 'ok', details: { field: 'abc' } },
    },
    isLoading: false,
  }),
}));

jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: () => ({ childExecutions: new Map(), isLoading: false }),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => ({ connectorTypes: {} }),
  useFetchConnector: () => ({ data: undefined }),
}));

jest.mock('./execution_take_action_split_button', () => ({
  ExecutionTakeActionSplitButton: () => null,
}));

jest.mock('./workflow_step_execution_tree', () => ({
  WorkflowStepExecutionTree: ({
    onStepExecutionClick,
    selectedId,
  }: {
    onStepExecutionClick: (stepExecutionId: string) => void;
    selectedId: string | null;
  }) => (
    <div data-test-subj="workflow-step-execution-tree">
      <div data-test-subj="tree-selected-id">{selectedId || 'No Selection'}</div>
      <button
        type="button"
        data-test-subj="mock-step-click"
        onClick={() => onStepExecutionClick('step-123')}
      >
        {'Click Step'}
      </button>
    </div>
  ),
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="step-icon" />,
}));

const mockCopyToClipboard = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;

const step: WorkflowStepExecutionDto = createMockStepExecutionDto({
  id: 'step-123',
  stepId: 'lookup_host',
  stepType: 'console',
  output: { result: 'ok', details: { field: 'abc' } },
});

const renderFlyout = () =>
  render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
    wrapper: getTestProvider({}),
  });

describe('WorkflowExecutionFlyout step URL and field paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlState.selectedStepExecutionId = undefined;
    jest.mocked(useWorkflowExecutionPolling).mockReturnValue({
      workflowExecution: createMockWorkflowExecutionDto({
        id: 'exec-1',
        workflowId: 'workflow-1',
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [step],
      }),
      isLoading: false,
      error: null,
    });
  });

  it('writes the selected step to the URL', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('mock-step-click'));

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('step-123');
  });

  it('opens the step panel from the URL and copies the output field path', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    renderFlyout();

    // Mounting must keep a deep-linked step, not reset it.
    expect(mockSetSelectedStepExecution).not.toHaveBeenCalled();
    expect(screen.getByTestId('tree-selected-id')).toHaveTextContent('step-123');
    expect(screen.getAllByTestId('workflowExecutionStepDataTable').length).toBeGreaterThan(0);

    const copyFieldPathButton = screen.getAllByTestId('workflowExecutionStepDataCopyFieldPath')[0];
    expect(copyFieldPathButton.querySelector('[data-euiicon-type="copy"]')).toBeInTheDocument();

    fireEvent.click(copyFieldPathButton);

    expect(mockCopyToClipboard).toHaveBeenCalledWith('steps.lookup_host.output.result');
  });

  it('includes the selected step on the shared execution link', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    renderFlyout();

    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutShare'));

    expect(mockCopyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining(
        '/app/workflows/workflow-1?tab=executions&executionId=exec-1&stepExecutionId=step-123'
      )
    );
  });

  it('clears the step from the URL when the step panel is closed', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    renderFlyout();

    expect(screen.getByTestId('workflowExecutionStepFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutStepClose'));

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('workflowExecutionFlyout')).toBeInTheDocument();
  });

  it('does not clear the selected step when the run flyout cascades the step flyout closed', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';
    const onCloseExecution = jest.fn();

    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={onCloseExecution} />, {
      wrapper: getTestProvider({}),
    });

    const stepFlyout = screen.getByTestId('workflowExecutionStepFlyout');
    const fiberKey = Object.keys(stepFlyout).find((key) => key.startsWith('__reactFiber'));
    expect(fiberKey).toEqual(expect.any(String));

    interface FlyoutFiber {
      return: FlyoutFiber | null;
      memoizedProps?: {
        onClose?: (event: Event, meta?: { reason?: string }) => void;
      };
    }
    let fiber: FlyoutFiber | null = (stepFlyout as unknown as Record<string, FlyoutFiber>)[
      fiberKey!
    ];
    let closeStepFlyout: ((event: Event, meta?: { reason?: string }) => void) | undefined;
    while (fiber) {
      const onClose = fiber.memoizedProps?.onClose;
      if (onClose && onClose !== onCloseExecution) {
        closeStepFlyout = onClose;
        break;
      }
      fiber = fiber.return;
    }
    expect(closeStepFlyout).toEqual(expect.any(Function));
    mockSetSelectedStepExecution.mockClear();

    closeStepFlyout!(new MouseEvent('click'), { reason: 'navigation-cascade' });

    expect(mockSetSelectedStepExecution).not.toHaveBeenCalled();
    expect(screen.getByTestId('workflowExecutionFlyout')).toBeInTheDocument();
  });

  it('keeps the step panel mounted when the run flyout is resized', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    renderFlyout();

    const runFlyout = screen.getByTestId('workflowExecutionFlyout');
    const fiberKey = Object.keys(runFlyout).find((key) => key.startsWith('__reactFiber'));
    expect(fiberKey).toEqual(expect.any(String));

    interface FlyoutFiber {
      return: FlyoutFiber | null;
      memoizedProps?: {
        id?: string;
        size?: number | string;
        onResize?: (width: number) => void;
      };
    }
    let fiber: FlyoutFiber | null = (runFlyout as unknown as Record<string, FlyoutFiber>)[
      fiberKey!
    ];
    let runFlyoutProps: FlyoutFiber['memoizedProps'];
    while (fiber) {
      if (fiber.memoizedProps?.id === 'execution') {
        runFlyoutProps = fiber.memoizedProps;
        break;
      }
      fiber = fiber.return;
    }

    // Writing the dragged width back into `size` re-registers the run flyout and drops the step.
    expect(runFlyoutProps?.size).toBe(560);
    expect(runFlyoutProps?.onResize).toBeUndefined();
    expect(screen.getByTestId('workflowExecutionStepFlyout')).toBeInTheDocument();
  });

  it('keeps the step panel open when the workflow name changes', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    const { rerender } = render(
      <WorkflowExecutionFlyout executionId="exec-1" workflowName="Before" onClose={jest.fn()} />,
      { wrapper: getTestProvider({}) }
    );

    expect(screen.getByRole('heading', { name: 'Before' })).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionStepFlyout')).toBeInTheDocument();

    rerender(
      <WorkflowExecutionFlyout executionId="exec-1" workflowName="After" onClose={jest.fn()} />
    );

    expect(screen.getByRole('heading', { name: 'After' })).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionStepFlyout')).toBeInTheDocument();
    expect(mockSetSelectedStepExecution).not.toHaveBeenCalled();
  });

  it('offers copy only on metadata rows that exist in the workflow context', () => {
    mockUrlState.selectedStepExecutionId = 'trigger';
    jest.mocked(useWorkflowExecutionPolling).mockReturnValue({
      workflowExecution: createMockWorkflowExecutionDto({
        id: 'exec-1',
        workflowId: 'workflow-1',
        status: ExecutionStatus.FAILED,
        stepExecutions: [step],
        traceId: 'trace-1',
        entryTransactionId: 'transaction-1',
        error: { type: 'ResponseError', message: 'index_not_found_exception' },
        context: { workflow: { name: 'demo' } },
      }),
      isLoading: false,
      error: null,
    });

    renderFlyout();

    const copyButtonInRow = (field: string) =>
      within(screen.getByText(field).closest('tr') as HTMLElement).queryByTestId(
        'workflowExecutionStepDataCopyFieldPath'
      );

    expect(copyButtonInRow('workflow.name')).toBeInTheDocument();
    expect(copyButtonInRow('trace.traceId')).not.toBeInTheDocument();
    expect(copyButtonInRow('executionError.message')).not.toBeInTheDocument();
  });
});
