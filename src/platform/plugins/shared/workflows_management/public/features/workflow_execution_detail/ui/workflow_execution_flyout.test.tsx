/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import {
  createMockStepExecutionDto,
  createMockWorkflowExecutionDto,
  TestWrapper,
} from '../../../shared/test_utils';

const mockCopyToClipboard = copyToClipboard as jest.MockedFunction<typeof copyToClipboard>;

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    copyToClipboard: jest.fn(),
  };
});

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

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: { navigateToApp: jest.fn() },
      notifications: { toasts: { addSuccess: jest.fn() } },
      settings: { client: { get: () => 'Browser' } },
    },
  }),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({
    href: '/app/workflows/workflow-1?tab=executions&executionId=exec-1',
    navigate: jest.fn(),
  }),
}));

const mockPollingResult: {
  workflowExecution: WorkflowExecutionDto | undefined;
  error: Error | null;
} = {
  workflowExecution: undefined,
  error: null,
};

jest.mock('../../../entities/workflows/model/use_workflow_execution_polling', () => ({
  useWorkflowExecutionPolling: () => mockPollingResult,
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
  useChildWorkflowExecutions: () => ({
    childExecutions: new Map(),
    isLoading: false,
  }),
}));

jest.mock('../../../entities/connectors/model/use_available_connectors', () => ({
  useAvailableConnectors: () => ({ connectorTypes: {} }),
  useFetchConnector: () => ({ data: undefined }),
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

jest.mock('./execution_take_action_split_button', () => ({
  ExecutionTakeActionSplitButton: () => <div data-test-subj="take-action" />,
}));

jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => <span data-test-subj="step-icon" />,
}));

const step: WorkflowStepExecutionDto = createMockStepExecutionDto({
  id: 'step-123',
  stepId: 'lookup_host',
  stepType: 'console',
  output: { result: 'ok', details: { field: 'abc' } },
});

const renderFlyout = () =>
  render(
    <TestWrapper>
      <WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />
    </TestWrapper>
  );

describe('WorkflowExecutionFlyout step URL and field paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlState.selectedStepExecutionId = undefined;
    mockPollingResult.workflowExecution = createMockWorkflowExecutionDto({
      id: 'exec-1',
      workflowId: 'workflow-1',
      status: ExecutionStatus.COMPLETED,
      stepExecutions: [step],
    });
    mockPollingResult.error = null;
  });

  it('writes the selected step to the URL', () => {
    renderFlyout();

    fireEvent.click(screen.getByTestId('mock-step-click'));

    expect(mockSetSelectedStepExecution).toHaveBeenCalledWith('step-123');
  });

  it('opens the step panel from the URL and copies the output field path', () => {
    mockUrlState.selectedStepExecutionId = 'step-123';

    renderFlyout();

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
});
