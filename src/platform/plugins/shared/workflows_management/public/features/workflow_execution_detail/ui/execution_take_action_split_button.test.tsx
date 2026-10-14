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
import { useLocation } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { ExecutionStatus } from '@kbn/workflows';
import { createMockWorkflowsCapabilities } from '@kbn/workflows-ui/mocks';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

const mockCancelExecution = jest.fn();
const mockUseWorkflowsCapabilities = jest.fn(createMockWorkflowsCapabilities);

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
    useWorkflowsApi: () => ({
      cancelExecution: mockCancelExecution,
    }),
  };
});

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({ href: '/app/workflows/wf-1?executionId=exec-1' }),
}));

const LocationSearch = () => {
  const { search } = useLocation();
  return <div data-test-subj="location-search">{search}</div>;
};

describe('ExecutionTakeActionSplitButton', () => {
  const execution = createMockWorkflowExecutionDto({
    id: 'exec-1',
    workflowId: 'wf-1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelExecution.mockResolvedValue(undefined);
    mockUseWorkflowsCapabilities.mockReturnValue(createMockWorkflowsCapabilities());
  });

  it('opens the replay modal without closing the current execution', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('executionId=exec-1');
    expect(search).toContain('replayExecutionId=exec-1');
    expect(search).not.toContain('replayIsTestRun');
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('keeps a test re-run as a test run when staying on the workflow', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton
          execution={createMockWorkflowExecutionDto({
            id: 'exec-1',
            workflowId: 'wf-1',
            isTestRun: true,
          })}
        />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('replayExecutionId=exec-1');
    expect(search).toContain('replayIsTestRun=true');
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  it('navigates to the workflow replay modal from another route', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/executions?executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/wf-1?tab=executions&executionId=exec-1&replayExecutionId=exec-1',
    });
  });

  it('navigates a test re-run with the test-run flag', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton
          execution={createMockWorkflowExecutionDto({
            id: 'exec-1',
            workflowId: 'wf-1',
            isTestRun: true,
          })}
        />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/executions?executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/wf-1?tab=executions&executionId=exec-1&replayExecutionId=exec-1&replayIsTestRun=true',
    });
  });

  it('does not open the replay modal without execute privilege', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;
    mockUseWorkflowsCapabilities.mockReturnValue({
      ...createMockWorkflowsCapabilities(),
      canExecuteWorkflow: false,
    });

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    expect(navigateToApp).not.toHaveBeenCalled();
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('replayExecutionId');
  });

  it('opens the replay modal when the workflow route has a trailing slash', () => {
    const services = createStartServicesMock();
    const navigateToApp = jest.fn();
    services.application.navigateToApp = navigateToApp;

    render(
      <Route path="/:id">
        <ExecutionTakeActionSplitButton execution={execution} />
        <LocationSearch />
      </Route>,
      {
        wrapper: getTestProvider({
          services,
          initialEntries: ['/wf-1/?tab=executions&executionId=exec-1'],
        }),
      }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Re-run' }));

    const search = screen.getByTestId('location-search').textContent ?? '';
    expect(search).toContain('replayExecutionId=exec-1');
    expect(navigateToApp).not.toHaveBeenCalled();
  });

  const renderButton = (overrides: Parameters<typeof createMockWorkflowExecutionDto>[0] = {}) => {
    const services = createStartServicesMock();
    return render(
      <ExecutionTakeActionSplitButton execution={createMockWorkflowExecutionDto(overrides)} />,
      { wrapper: getTestProvider({ services }) }
    );
  };

  const openTakeActionMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
  };

  it('cancels a running execution from the take-action menu', async () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: undefined,
    });

    openTakeActionMenu();
    const cancelItem = screen.getByTestId('workflowExecutionFlyoutCancelExecution');
    expect(cancelItem).toBeEnabled();
    fireEvent.click(cancelItem);

    await waitFor(() => {
      expect(mockCancelExecution).toHaveBeenCalledWith('exec-1');
    });
  });

  it('disables Cancel execution when finishedAt is set even if status is still RUNNING', () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: '2025-08-05T20:01:00.000Z',
    });

    openTakeActionMenu();
    expect(screen.getByTestId('workflowExecutionFlyoutCancelExecution')).toBeDisabled();
  });

  it('does not cancel a finished run if the disabled item is activated', () => {
    renderButton({
      status: ExecutionStatus.RUNNING,
      finishedAt: '2025-08-05T20:01:00.000Z',
    });

    openTakeActionMenu();
    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutCancelExecution'));
    expect(mockCancelExecution).not.toHaveBeenCalled();
  });

  it('disables Cancel execution when the run is terminal', () => {
    renderButton({
      status: ExecutionStatus.COMPLETED,
    });

    openTakeActionMenu();
    expect(screen.getByTestId('workflowExecutionFlyoutCancelExecution')).toBeDisabled();
  });

  it('does not cancel a terminal execution if the disabled item is activated', () => {
    renderButton({
      status: ExecutionStatus.FAILED,
    });

    openTakeActionMenu();
    fireEvent.click(screen.getByTestId('workflowExecutionFlyoutCancelExecution'));
    expect(mockCancelExecution).not.toHaveBeenCalled();
  });
});
