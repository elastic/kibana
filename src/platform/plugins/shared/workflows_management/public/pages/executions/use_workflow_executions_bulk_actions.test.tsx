/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { ExecutionStatus } from '@kbn/workflows';
import { useWorkflowExecutionsBulkActions } from './use_workflow_executions_bulk_actions';
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

const createRow = (
  id: string,
  workflowId: string,
  context: Record<string, unknown> = {}
): DataTableRecord => ({
  id,
  raw: {
    _id: id,
    _source: {
      id,
      workflowId,
      status: ExecutionStatus.COMPLETED,
      context,
    },
  } as EsHitRecord,
  flattened: { id },
});

describe('useWorkflowExecutionsBulkActions', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: true });
    mockRunWorkflow.mockResolvedValue({ workflowExecutionId: 'new-exec' });
  });

  it('includes bulk re-run when user can execute workflows', () => {
    const services = createStartServicesMock();
    const rows = [createRow('exec-1', 'wf-1')];

    const { result } = renderHook(() => useWorkflowExecutionsBulkActions({ onRefresh, rows }), {
      wrapper: getTestProvider({ services }),
    });

    const reRunAction = result.current.find((action) => action.key === 'bulk-re-run');
    expect(reRunAction).toBeDefined();
    expect(reRunAction?.['data-test-subj']).toBe('workflowExecutionsBulkActionReRun');
  });

  it('omits bulk re-run when user cannot execute workflows', () => {
    mockUseWorkflowsCapabilities.mockReturnValue({ canExecuteWorkflow: false });
    const services = createStartServicesMock();
    const rows = [createRow('exec-1', 'wf-1')];

    const { result } = renderHook(() => useWorkflowExecutionsBulkActions({ onRefresh, rows }), {
      wrapper: getTestProvider({ services }),
    });

    expect(result.current).toHaveLength(0);
  });

  it('re-runs selected executions and refreshes the list without navigating', async () => {
    const services = createStartServicesMock();
    const mockNavigateToApp = jest.fn();
    services.application.navigateToApp = mockNavigateToApp;

    const rows = [
      createRow('exec-1', 'wf-1', { inputs: { foo: 'bar' }, event: { type: 'alert' } }),
      createRow('exec-2', 'wf-2', { inputs: { baz: 1 } }),
    ];
    const { result } = renderHook(() => useWorkflowExecutionsBulkActions({ onRefresh, rows }), {
      wrapper: getTestProvider({ services }),
    });

    const reRunAction = result.current.find((action) => action.key === 'bulk-re-run');

    await act(async () => {
      await reRunAction?.onClick({ selectedDocIds: ['exec-1', 'exec-2'] });
    });

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
