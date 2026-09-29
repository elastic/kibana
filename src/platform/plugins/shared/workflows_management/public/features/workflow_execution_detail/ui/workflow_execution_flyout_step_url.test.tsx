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
import type { MockedFunction } from 'vitest';
import { vi } from 'vitest';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
} from '../../../shared/test_utils';

vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: vi.fn(),
  };
});

vi.mock('../../../entities/workflows/model/use_workflow_execution_polling');

const mockSetSelectedStepExecution = vi.fn();
const mockUrlState: { selectedStepExecutionId: string | undefined } = {
  selectedStepExecutionId: undefined,
};

vi.mock('../../../hooks/use_workflow_url_state', () => {
  const mocked = {
    useWorkflowUrlState: () => ({
      selectedStepExecutionId: mockUrlState.selectedStepExecutionId,
      setSelectedStepExecution: mockSetSelectedStepExecution,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../hooks/navigation/use_navigate_to_execution', () => {
  const mocked = {
    useNavigateToExecution: () => ({
      href: '/app/workflows/workflow-1?tab=executions&executionId=exec-1',
      navigate: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../model/use_step_execution', () => {
  const mocked = {
    useStepExecution: () => ({
      data: {
        input: { host: 'web-1' },
        output: { result: 'ok', details: { field: 'abc' } },
      },
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../model/use_child_workflow_executions', () => {
  const mocked = {
    useChildWorkflowExecutions: () => ({ childExecutions: new Map(), isLoading: false }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../entities/connectors/model/use_available_connectors', () => {
  const mocked = {
    useAvailableConnectors: () => ({ connectorTypes: {} }),
    useFetchConnector: () => ({ data: undefined }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./execution_take_action_split_button', () => {
  const mocked = {
    ExecutionTakeActionSplitButton: () => null,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./workflow_step_execution_tree', () => {
  const mocked = {
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
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../shared/ui/step_icons/step_icon', () => {
  const mocked = {
    StepIcon: () => <span data-test-subj="step-icon" />,
  };
  return { ...mocked, default: mocked };
});

const mockCopyToClipboard = copyToClipboard as MockedFunction<typeof copyToClipboard>;

const step: WorkflowStepExecutionDto = createMockStepExecutionDto({
  id: 'step-123',
  stepId: 'lookup_host',
  stepType: 'console',
  output: { result: 'ok', details: { field: 'abc' } },
});

const renderFlyout = () =>
  render(<WorkflowExecutionFlyout executionId="exec-1" onClose={vi.fn()} />, {
    wrapper: getTestProvider({}),
  });

describe('WorkflowExecutionFlyout step URL and field paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUrlState.selectedStepExecutionId = undefined;
    vi.mocked(useWorkflowExecutionPolling).mockReturnValue({
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

    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutStepClose'));

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith(null);
  });

  it('offers copy only on metadata rows that exist in the workflow context', () => {
    mockUrlState.selectedStepExecutionId = 'trigger';
    vi.mocked(useWorkflowExecutionPolling).mockReturnValue({
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
