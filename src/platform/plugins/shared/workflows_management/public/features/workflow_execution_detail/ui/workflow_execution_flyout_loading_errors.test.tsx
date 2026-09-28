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
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { WorkflowExecutionFlyout } from './workflow_execution_flyout';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import { setStepExecutionsTotal } from '../../../entities/workflows/store/workflow_detail/slice';
import { getTestProvider } from '../../../shared/mocks/test_providers';

jest.mock('../../../entities/workflows/model/use_workflow_execution_polling');
jest.mock('../model/use_child_workflow_executions', () => ({
  useChildWorkflowExecutions: () => ({ childExecutions: new Map(), isLoading: false }),
}));
jest.mock('./execution_take_action_split_button', () => ({
  ExecutionTakeActionSplitButton: () => null,
}));
jest.mock('../../../shared/ui/execution_data_viewer/json_editor_common', () => ({
  JSONCodeEditorCommonMemoized: ({ jsonValue }: { jsonValue: string }) => (
    <pre data-test-subj="execution-json">{jsonValue}</pre>
  ),
}));

const execution: WorkflowExecutionDto = {
  id: 'exec-1',
  spaceId: 'default',
  workflowId: 'workflow-1',
  isTestRun: false,
  status: ExecutionStatus.COMPLETED,
  startedAt: '2026-09-24T00:00:00Z',
  finishedAt: '2026-09-24T00:01:00Z',
  duration: 60000,
  error: null,
  yaml: 'name: test',
  workflowDefinition: { version: '1', name: 'test', enabled: true, triggers: [], steps: [] },
  stepExecutions: [],
};

describe('WorkflowExecutionFlyout loading errors', () => {
  const sizeError = new Error('Step execution data is too large to load.');

  it.each([
    ['without loaded data', undefined],
    ['with a previous snapshot', execution],
  ] as const)('shows a loading error on both tabs %s', (_scenario, workflowExecution) => {
    jest.mocked(useWorkflowExecutionPolling).mockReturnValue({
      workflowExecution,
      isLoading: false,
      error: sizeError,
    });
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
      wrapper: getTestProvider({}),
    });

    expect(screen.getByText(sizeError.message)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    expect(screen.getByText(sizeError.message)).toBeInTheDocument();
    expect(screen.queryByTestId('execution-json')).not.toBeInTheDocument();
  });

  it('shows the existing unavailable state on the JSON tab when reported steps are missing', () => {
    jest.mocked(useWorkflowExecutionPolling).mockReturnValue({
      workflowExecution: execution,
      isLoading: false,
      error: null,
    });
    const store = createMockStore();
    store.dispatch(setStepExecutionsTotal(101));
    render(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />, {
      wrapper: getTestProvider({ store }),
    });

    fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    expect(screen.getByText('Unable to show step executions')).toBeInTheDocument();
    expect(screen.queryByTestId('execution-json')).not.toBeInTheDocument();
  });

  it('restores JSON after a successful retry', () => {
    const polling = jest.mocked(useWorkflowExecutionPolling);
    polling.mockReturnValue({ workflowExecution: execution, isLoading: false, error: null });
    const { rerender } = render(
      <WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />,
      { wrapper: getTestProvider({}) }
    );
    fireEvent.click(screen.getByRole('tab', { name: 'JSON' }));
    expect(screen.getByTestId('execution-json')).toHaveTextContent('exec-1');

    polling.mockReturnValue({ workflowExecution: execution, isLoading: false, error: sizeError });
    rerender(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />);
    expect(screen.getByText(sizeError.message)).toBeInTheDocument();
    expect(screen.queryByTestId('execution-json')).not.toBeInTheDocument();

    polling.mockReturnValue({ workflowExecution: execution, isLoading: false, error: null });
    rerender(<WorkflowExecutionFlyout executionId="exec-1" onClose={jest.fn()} />);
    expect(screen.queryByText(sizeError.message)).not.toBeInTheDocument();
    expect(screen.getByTestId('execution-json')).toHaveTextContent('exec-1');
  });
});
