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
import { useRunWorkflow, useWorkflowsApi, useWorkflowsCapabilities } from '@kbn/workflows-ui';
import { createMockWorkflowApi, createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockRunWorkflow = jest.fn();
const mockWorkflowApi = createMockWorkflowApi();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useRunWorkflow: jest.fn(),
  useWorkflowsApi: jest.fn(),
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
    mockWorkflowApi.testWorkflow.mockResolvedValue({ workflowExecutionId: 'new-test-exec' });
    jest.mocked(useRunWorkflow).mockReturnValue({
      mutateAsync: mockRunWorkflow,
      isLoading: false,
    } as unknown as ReturnType<typeof useRunWorkflow>);
    jest.mocked(useWorkflowsApi).mockReturnValue(mockWorkflowApi);
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
    expect(mockWorkflowApi.testWorkflow).not.toHaveBeenCalled();
  });

  it('re-runs a test execution through testWorkflow', async () => {
    renderButton({
      isTestRun: true,
      context: { inputs: { alertId: 'a-1' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    await waitFor(() => {
      expect(mockWorkflowApi.testWorkflow).toHaveBeenCalledWith({
        workflowId: 'wf-1',
        inputs: { alertId: 'a-1' },
      });
    });
    expect(mockRunWorkflow).not.toHaveBeenCalled();
  });
});
