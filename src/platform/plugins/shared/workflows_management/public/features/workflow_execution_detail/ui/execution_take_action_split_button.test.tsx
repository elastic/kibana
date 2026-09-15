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
import { useRunWorkflow, useTestWorkflow, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockRunWorkflow = jest.fn();
const mockTestWorkflow = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useRunWorkflow: jest.fn(),
  useTestWorkflow: jest.fn(),
  useWorkflowsCapabilities: jest.fn(),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

describe('ExecutionTakeActionSplitButton', () => {
  const services = createStartServicesMock();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
    mockTestWorkflow.mockResolvedValue({ workflowExecutionId: 'new-test-exec' });
    jest.mocked(useRunWorkflow).mockReturnValue({
      mutateAsync: mockRunWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useRunWorkflow>);
    jest.mocked(useTestWorkflow).mockReturnValue({
      mutateAsync: mockTestWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useTestWorkflow>);
    jest.mocked(useWorkflowsCapabilities).mockReturnValue(createMockWorkflowsCapabilities());
    services.notifications.toasts.addSuccess = jest.fn();
    services.notifications.toasts.addError = jest.fn();
  });

  const renderButton = (overrides: Parameters<typeof createMockWorkflowExecutionDto>[0] = {}) =>
    render(
      <ExecutionTakeActionSplitButton execution={createMockWorkflowExecutionDto(overrides)} />,
      { wrapper: getTestProvider({ services }) }
    );

  it('re-runs a production execution through runWorkflow', async () => {
    renderButton({
      isTestRun: false,
      context: { inputs: { alertId: 'a-1' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockRunWorkflow).toHaveBeenCalledWith({
        id: 'wf-1',
        inputs: { alertId: 'a-1' },
      });
    });
    expect(mockTestWorkflow).not.toHaveBeenCalled();
  });

  it('re-runs a test execution through testWorkflow', async () => {
    renderButton({
      isTestRun: true,
      context: { inputs: { alertId: 'a-1' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockTestWorkflow).toHaveBeenCalledWith({
        workflowId: 'wf-1',
        inputs: { alertId: 'a-1' },
      });
    });
    expect(mockRunWorkflow).not.toHaveBeenCalled();
  });

  it('disables Re-run while a test re-run is pending', () => {
    jest.mocked(useTestWorkflow).mockReturnValue({
      mutateAsync: mockTestWorkflow,
      isLoading: true,
    } as unknown as ReturnType<typeof useTestWorkflow>);

    renderButton({ isTestRun: true });

    expect(screen.getByRole('button', { name: 'Re-run' })).toBeDisabled();
  });
});
