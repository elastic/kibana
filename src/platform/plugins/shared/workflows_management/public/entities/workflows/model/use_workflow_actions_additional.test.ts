/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowDetailDto, WorkflowListDto } from '@kbn/workflows';
import { useWorkflowActions } from './use_workflow_actions';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import {
  createMockWorkflowDetailDto,
  createMockWorkflowListItemDto,
} from '../../../shared/test_utils/mock_workflow_factories';

jest.mock('../../../features/import_workflows/lib/parse_import_file');
jest.mock('../../../hooks/use_kibana');
jest.mock('../../../hooks/use_telemetry');
jest.mock('@kbn/workflows-ui', () => ({
  useRunWorkflow: ({ onSuccess, onError }: { onSuccess: Function; onError: Function }) => ({
    mutate: jest.fn((...args: unknown[]) => {
      try {
        onSuccess(undefined, args[0]);
      } catch {
        // no-op
      }
    }),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    data: undefined,
    error: null,
    reset: jest.fn(),
    onSuccess,
    onError,
  }),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseTelemetry = useTelemetry as jest.MockedFunction<typeof useTelemetry>;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
    logger: { log: () => {}, warn: () => {}, error: () => {} },
  });

describe('useWorkflowActions - CRUD mutations', () => {
  let mockHttp: {
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
  let mockTelemetry: Record<string, jest.Mock>;
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHttp = {
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    mockTelemetry = {
      reportWorkflowUpdated: jest.fn(),
      reportWorkflowDeleted: jest.fn(),
      reportWorkflowCloned: jest.fn(),
      reportWorkflowRunInitiated: jest.fn(),
      reportWorkflowStepTestRunInitiated: jest.fn(),
    };

    mockUseKibana.mockReturnValue({ services: { http: mockHttp } } as unknown as ReturnType<
      typeof useKibana
    >);
    mockUseTelemetry.mockReturnValue(mockTelemetry as unknown as ReturnType<typeof useTelemetry>);

    queryClient = createQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  // ---------------------------------------------------------------------------
  // updateWorkflow
  // ---------------------------------------------------------------------------
  describe('updateWorkflow', () => {
    it('should call PUT /api/workflows/:id with the workflow body', async () => {
      mockHttp.put.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockHttp.put).toHaveBeenCalledWith('/api/workflows/wf-1', {
        body: JSON.stringify({ enabled: true }),
      });
    });

    it('should optimistically update workflow list queries on mutate', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'Workflow 1', enabled: false }),
        ],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      // Make the HTTP call hang so we can inspect optimistic state
      let resolveHttp: () => void;
      mockHttp.put.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveHttp = resolve;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      // After onMutate, optimistic update should have been applied
      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
        expect(updated?.results[0].enabled).toBe(true);
      });

      // Resolve the HTTP call
      act(() => {
        resolveHttp!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });

    it('should roll back optimistic update on error for non-YAML changes', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'Workflow 1', enabled: false }),
        ],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      mockHttp.put.mockRejectedValueOnce(new Error('Server Error'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isError).toBe(true));

      // Data should be rolled back
      const rolledBack = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
      expect(rolledBack?.results[0].enabled).toBe(false);
    });

    it('should report telemetry on success', async () => {
      mockHttp.put.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockHttp.put.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: false },
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          error: expect.any(Error),
        })
      );
    });

    it('should skip refetch when skipRefetch is true', async () => {
      mockHttp.put.mockResolvedValueOnce(undefined);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
          skipRefetch: true,
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ refetchType: 'none' }));

      invalidateSpy.mockRestore();
    });

    it('should include bulkActionCount in telemetry when provided', async () => {
      mockHttp.put.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
          isBulkAction: true,
          bulkActionCount: 5,
        });
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          isBulkAction: true,
          bulkActionCount: 5,
        })
      );
    });

    it('should optimistically update workflow detail for non-YAML changes', async () => {
      const detailData = createMockWorkflowDetailDto({
        id: 'wf-1',
        name: 'Workflow 1',
        enabled: false,
        yaml: 'name: test',
      });

      queryClient.setQueryData(['workflows', 'wf-1'], detailData);

      let resolveHttp: () => void;
      mockHttp.put.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveHttp = resolve;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { enabled: true },
        });
      });

      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowDetailDto>(['workflows', 'wf-1']);
        expect(updated?.enabled).toBe(true);
      });

      act(() => {
        resolveHttp!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });

    it('should NOT optimistically update workflow detail for YAML changes', async () => {
      const detailData = createMockWorkflowDetailDto({
        id: 'wf-1',
        name: 'Workflow 1',
        yaml: 'name: old',
      });

      queryClient.setQueryData(['workflows', 'wf-1'], detailData);

      let resolveHttp: () => void;
      mockHttp.put.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveHttp = resolve;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.updateWorkflow.mutate({
          id: 'wf-1',
          workflow: { yaml: 'name: new' },
        });
      });

      // For YAML changes, the detail should NOT be optimistically updated
      await waitFor(() => {
        const current = queryClient.getQueryData<WorkflowDetailDto>(['workflows', 'wf-1']);
        expect(current?.yaml).toBe('name: old');
      });

      act(() => {
        resolveHttp!();
      });

      await waitFor(() => expect(result.current.updateWorkflow.isSuccess).toBe(true));
    });
  });

  // ---------------------------------------------------------------------------
  // deleteWorkflows
  // ---------------------------------------------------------------------------
  describe('deleteWorkflows', () => {
    it('should call DELETE /api/workflows with the IDs', async () => {
      mockHttp.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-2'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));

      expect(mockHttp.delete).toHaveBeenCalledWith('/api/workflows', {
        body: JSON.stringify({ ids: ['wf-1', 'wf-2'] }),
      });
    });

    it('should optimistically remove workflows from list', async () => {
      const listData: WorkflowListDto = {
        results: [
          createMockWorkflowListItemDto({ id: 'wf-1', name: 'W1' }),
          createMockWorkflowListItemDto({ id: 'wf-2', name: 'W2' }),
          createMockWorkflowListItemDto({ id: 'wf-3', name: 'W3' }),
        ],
        page: 1,
        size: 100,
        total: 3,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      let resolveHttp: () => void;
      mockHttp.delete.mockReturnValue(
        new Promise<void>((resolve) => {
          resolveHttp = resolve;
        })
      );

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-3'] });
      });

      await waitFor(() => {
        const updated = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
        expect(updated?.results).toHaveLength(1);
        expect(updated?.results[0].id).toBe('wf-2');
        expect(updated?.total).toBe(1);
      });

      act(() => {
        resolveHttp!();
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));
    });

    it('should roll back on error', async () => {
      const listData: WorkflowListDto = {
        results: [createMockWorkflowListItemDto({ id: 'wf-1', name: 'W1' })],
        page: 1,
        size: 100,
        total: 1,
      };

      queryClient.setQueryData(['workflows', 'list'], listData);

      mockHttp.delete.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isError).toBe(true));

      const rolledBack = queryClient.getQueryData<WorkflowListDto>(['workflows', 'list']);
      expect(rolledBack?.results).toHaveLength(1);
      expect(rolledBack?.total).toBe(1);
    });

    it('should report telemetry on success for each deleted workflow', async () => {
      mockHttp.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1', 'wf-2'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledTimes(2);
      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowIds: ['wf-1'],
          isBulkDelete: true,
          error: undefined,
        })
      );
    });

    it('should report telemetry on error for each workflow', async () => {
      mockHttp.delete.mockRejectedValueOnce(new Error('Fail'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.deleteWorkflows.mutate({ ids: ['wf-1'] });
      });

      await waitFor(() => expect(result.current.deleteWorkflows.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowDeleted).toHaveBeenCalledWith(
        expect.objectContaining({
          isBulkDelete: false,
          error: expect.any(Error),
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // cloneWorkflow
  // ---------------------------------------------------------------------------
  describe('cloneWorkflow', () => {
    it('should call POST /api/workflows/:id/clone', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockHttp.post.mockResolvedValueOnce(cloned);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(mockHttp.post).toHaveBeenCalledWith('/api/workflows/wf-1/clone');
      expect(result.current.cloneWorkflow.data).toEqual(cloned);
    });

    it('should report telemetry on success with source and new IDs', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockHttp.post.mockResolvedValueOnce(cloned);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowCloned).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWorkflowId: 'wf-1',
          newWorkflowId: 'wf-clone',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockHttp.post.mockRejectedValueOnce(new Error('Clone failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowCloned).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceWorkflowId: 'wf-1',
          error: expect.any(Error),
        })
      );
    });

    it('should invalidate workflow queries on success', async () => {
      const cloned = createMockWorkflowDetailDto({ id: 'wf-clone', name: 'Clone' });
      mockHttp.post.mockResolvedValueOnce(cloned);
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.cloneWorkflow.mutate({ id: 'wf-1' });
      });

      await waitFor(() => expect(result.current.cloneWorkflow.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['workflows'] })
      );

      invalidateSpy.mockRestore();
    });
  });

  // ---------------------------------------------------------------------------
  // runIndividualStep
  // ---------------------------------------------------------------------------
  describe('runIndividualStep', () => {
    it('should call POST /api/workflows/testStep', async () => {
      const response = { workflowExecutionId: 'exec-1' };
      mockHttp.post.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: { key: 'value' },
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isSuccess).toBe(true));

      expect(mockHttp.post).toHaveBeenCalledWith('/api/workflows/testStep', {
        body: JSON.stringify({
          stepId: 'step-1',
          contextOverride: { key: 'value' },
          workflowYaml: 'name: test',
          workflowId: 'wf-1',
        }),
      });
    });

    it('should report telemetry on success', async () => {
      const response = { workflowExecutionId: 'exec-1' };
      mockHttp.post.mockResolvedValueOnce(response);

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: {},
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isSuccess).toBe(true));

      expect(mockTelemetry.reportWorkflowStepTestRunInitiated).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'step-1',
          error: undefined,
        })
      );
    });

    it('should report telemetry on error', async () => {
      mockHttp.post.mockRejectedValueOnce(new Error('Step failed'));

      const { result } = renderHook(() => useWorkflowActions(), { wrapper });

      act(() => {
        result.current.runIndividualStep.mutate({
          stepId: 'step-1',
          workflowId: 'wf-1',
          workflowYaml: 'name: test',
          contextOverride: {},
        });
      });

      await waitFor(() => expect(result.current.runIndividualStep.isError).toBe(true));

      expect(mockTelemetry.reportWorkflowStepTestRunInitiated).toHaveBeenCalledWith(
        expect.objectContaining({
          stepId: 'step-1',
          error: expect.any(Error),
        })
      );
    });
  });
});
