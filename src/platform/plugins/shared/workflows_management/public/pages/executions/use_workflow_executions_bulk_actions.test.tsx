/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import {
  useWorkflowExecutionRerun,
  useWorkflowExecutionsBulkActions,
} from './use_workflow_executions_bulk_actions';
import { createStartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockRunWorkflow = jest.fn();
const mockUseWorkflowsCapabilities = jest.fn(() => ({
  canExecuteWorkflow: true,
}));

jest.mock('@kbn/workflows-ui', () => {
  const actual = jest.requireActual('@kbn/workflows-ui');
  return {
    ...actual,
    useRunWorkflow: () => ({ mutateAsync: mockRunWorkflow }),
    useWorkflowsCapabilities: () => mockUseWorkflowsCapabilities(),
  };
});

const createExecution = (
  id: string,
  workflowId: string,
  context: Record<string, unknown> = {}
): WorkflowExecutionListItemDto => ({
  spaceId: 'default',
  id,
  workflowId,
  status: ExecutionStatus.COMPLETED,
  isTestRun: false,
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: '2026-01-01T00:00:03Z',
  duration: 3000,
  error: null,
  context,
});

describe('useWorkflowExecutionsBulkActions', () => {
  const onRefresh = jest.fn();
  const onAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: true });
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
  });

  it('includes bulk re-run when user can execute workflows', () => {
    const services = createStartServicesMock();
    const executions = [createExecution('exec-1', 'wf-1')];

    const { result } = renderHook(
      () =>
        useWorkflowExecutionsBulkActions({
          onRefresh,
          onAction,
          executions,
          selectedExecutionIds: ['exec-1'],
        }),
      {
        wrapper: getTestProvider({ services }),
      }
    );

    const reRunAction = result.current.panels[0]?.items?.find((item) => item.key === 'bulk-re-run');
    expect(reRunAction).toBeDefined();
    expect(reRunAction?.['data-test-subj']).toBe('workflowExecutionsBulkActionReRun');
  });

  it('omits bulk re-run when user cannot execute workflows', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: false });
    const services = createStartServicesMock();
    const executions = [createExecution('exec-1', 'wf-1')];

    const { result } = renderHook(
      () =>
        useWorkflowExecutionsBulkActions({
          onRefresh,
          onAction,
          executions,
          selectedExecutionIds: ['exec-1'],
        }),
      {
        wrapper: getTestProvider({ services }),
      }
    );

    expect(result.current.panels).toHaveLength(0);
  });

  it('re-runs selected executions and refreshes the list without navigating', async () => {
    const services = createStartServicesMock();
    const mockNavigateToApp = jest.fn();
    services.application.navigateToApp = mockNavigateToApp;

    const executions = [
      createExecution('exec-1', 'wf-1', { inputs: { foo: 'bar' }, event: { type: 'alert' } }),
      createExecution('exec-2', 'wf-2', { inputs: { baz: 1 } }),
    ];
    const { result } = renderHook(
      () =>
        useWorkflowExecutionsBulkActions({
          onRefresh,
          onAction,
          executions,
          selectedExecutionIds: ['exec-1', 'exec-2'],
        }),
      {
        wrapper: getTestProvider({ services }),
      }
    );

    const reRunAction = result.current.panels[0]?.items?.find((item) => item.key === 'bulk-re-run');

    await act(async () => {
      reRunAction?.onClick?.({} as unknown as React.MouseEvent<HTMLHRElement>);
    });

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(mockRunWorkflow).toHaveBeenCalledTimes(2);
    expect(mockRunWorkflow).toHaveBeenCalledWith({
      id: 'wf-1',
      inputs: { foo: 'bar', event: { type: 'alert' } },
    });
    expect(mockRunWorkflow).toHaveBeenCalledWith({
      id: 'wf-2',
      inputs: { baz: 1 },
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(mockNavigateToApp).not.toHaveBeenCalled();
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
  });
});

describe('useWorkflowExecutionRerun', () => {
  const mockSetSelectedExecution = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
  });

  it('re-runs execution and opens the flyout', async () => {
    const services = createStartServicesMock();

    const { result } = renderHook(
      () => useWorkflowExecutionRerun({ setSelectedExecution: mockSetSelectedExecution }),
      { wrapper: getTestProvider({ services }) }
    );

    await act(async () => {
      await result.current({
        workflowId: 'wf-1',
        context: { inputs: { foo: 'bar' }, event: { type: 'alert' } },
      });
    });

    expect(mockRunWorkflow).toHaveBeenCalledWith({
      id: 'wf-1',
      inputs: { foo: 'bar', event: { type: 'alert' } },
    });
    expect(mockSetSelectedExecution).toHaveBeenCalledWith('new-exec');
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('shows an error toast when re-run fails', async () => {
    const services = createStartServicesMock();
    mockRunWorkflow.mockRejectedValue(new Error('run failed'));

    const { result } = renderHook(
      () => useWorkflowExecutionRerun({ setSelectedExecution: mockSetSelectedExecution }),
      { wrapper: getTestProvider({ services }) }
    );

    await act(async () => {
      await result.current({ workflowId: 'wf-1' });
    });

    expect(mockSetSelectedExecution).not.toHaveBeenCalled();
    expect(services.notifications.toasts.addError).toHaveBeenCalled();
  });
});
