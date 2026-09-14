/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockRunWorkflow = jest.fn();
const mockSetSelectedExecution = jest.fn();
const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canExecuteWorkflow: true,
  canUpdateWorkflow: true,
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useRunWorkflow: () => ({ mutateAsync: mockRunWorkflow, isLoading: false }),
    useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  };
});

jest.mock('../../../hooks/use_workflow_url_state', () => ({
  useWorkflowUrlState: () => ({
    setSelectedExecution: mockSetSelectedExecution,
  }),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

describe('ExecutionTakeActionSplitButton', () => {
  const execution = createMockWorkflowExecutionDto({
    id: 'exec-1',
    workflowId: 'wf-1',
    context: { inputs: { foo: 'bar' }, event: { type: 'alert' } },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({
      canExecuteWorkflow: true,
      canUpdateWorkflow: true,
    });
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
  });

  it('opens the new execution after a successful re-run', async () => {
    const services = createStartServicesMock();

    render(<ExecutionTakeActionSplitButton execution={execution} />, {
      wrapper: getTestProvider({ services }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockRunWorkflow).toHaveBeenCalledWith({
        id: 'wf-1',
        inputs: { foo: 'bar', event: { type: 'alert' } },
      });
    });

    expect(mockSetSelectedExecution).toHaveBeenCalledWith('new-exec');
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('does not change the selected execution when re-run fails', async () => {
    const services = createStartServicesMock();
    mockRunWorkflow.mockRejectedValue(new Error('run failed'));

    render(<ExecutionTakeActionSplitButton execution={execution} />, {
      wrapper: getTestProvider({ services }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalled();
    });

    expect(mockSetSelectedExecution).not.toHaveBeenCalled();
  });
});
