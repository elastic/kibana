/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto, WorkflowYaml } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useExportWithReferences } from './use_export_with_references';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/workflows-ui');
const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

jest.mock('../../../hooks/use_telemetry', () => ({
  useTelemetry: () => ({ reportWorkflowExported: jest.fn() }),
}));

const mockExportSingleWorkflow = jest.fn();
const mockExportWorkflows = jest.fn();
const mockFindMissingReferencedIds = jest.fn();
const mockResolveAllReferences = jest.fn();

jest.mock('../../../common/lib/export_workflows', () => ({
  exportSingleWorkflow: (...args: unknown[]) => mockExportSingleWorkflow(...args),
  exportWorkflows: (...args: unknown[]) => mockExportWorkflows(...args),
  findMissingReferencedIds: (...args: unknown[]) => mockFindMissingReferencedIds(...args),
  resolveAllReferences: (...args: unknown[]) => mockResolveAllReferences(...args),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const createWorkflow = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'w-1',
  name: 'Test Workflow',
  description: 'desc',
  enabled: true,
  definition: { steps: [] } as unknown as WorkflowYaml,
  createdAt: '2026-01-01T00:00:00Z',
  history: [],
  valid: true,
  ...overrides,
});

describe('useExportWithReferences', () => {
  let mockApi: { exportWorkflows: jest.Mock };
  let mockToasts: {
    addSuccess: jest.Mock;
    addWarning: jest.Mock;
    addError: jest.Mock;
  };
  let onComplete: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi = { exportWorkflows: jest.fn() };
    mockToasts = {
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addError: jest.fn(),
    };
    onComplete = jest.fn();
    mockUseWorkflowsApi.mockReturnValue(mockApi as any);
    mockUseKibana.mockReturnValue({
      services: {
        notifications: { toasts: mockToasts },
      },
    } as any);
    mockExportWorkflows.mockResolvedValue(1);
    mockFindMissingReferencedIds.mockReturnValue([]);
    mockResolveAllReferences.mockImplementation((initial: WorkflowListItemDto[]) => initial);
  });

  describe('startExport', () => {
    it('should export directly when no references are missing', () => {
      mockFindMissingReferencedIds.mockReturnValue([]);
      const wA = createWorkflow({ id: 'a' });

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: new Map(), onComplete })
      );

      act(() => result.current.startExport([wA]));

      expect(mockExportSingleWorkflow).toHaveBeenCalledWith(wA);
      expect(result.current.exportModalState).toBeNull();
    });

    it('should show modal when missing references exist in allWorkflowsMap', () => {
      const wA = createWorkflow({ id: 'a' });
      const wB = createWorkflow({ id: 'b', name: 'Referenced' });
      mockFindMissingReferencedIds.mockReturnValue(['b']);

      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: allMap, onComplete })
      );

      act(() => result.current.startExport([wA]));

      expect(result.current.exportModalState).not.toBeNull();
      expect(result.current.exportModalState!.missingWorkflows).toEqual([wB]);
      expect(result.current.exportModalState!.pendingExport).toEqual([wA]);
      expect(mockExportSingleWorkflow).not.toHaveBeenCalled();
    });

    it('should export directly when missing references are NOT in allWorkflowsMap (deleted)', () => {
      const wA = createWorkflow({ id: 'a' });
      mockFindMissingReferencedIds.mockReturnValue(['deleted-id']);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: new Map([['a', wA]]), onComplete })
      );

      act(() => result.current.startExport([wA]));

      expect(mockExportSingleWorkflow).toHaveBeenCalledWith(wA);
      expect(result.current.exportModalState).toBeNull();
    });
  });

  describe('handleIgnore', () => {
    it('should export only the originally selected workflows', async () => {
      const wA = createWorkflow({ id: 'a' });
      const wB = createWorkflow({ id: 'b' });
      mockFindMissingReferencedIds.mockReturnValue(['b']);
      mockExportWorkflows.mockResolvedValue(1);

      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: allMap, onComplete })
      );

      // First, trigger the modal
      act(() => result.current.startExport([wA]));
      expect(result.current.exportModalState).not.toBeNull();

      // Then ignore references
      await act(async () => result.current.handleIgnore());

      await waitFor(() => {
        expect(mockExportWorkflows).toHaveBeenCalledWith([wA], mockApi);
      });
      expect(result.current.exportModalState).toBeNull();
    });
  });

  describe('handleAddDirect', () => {
    it('should merge direct references into the export', async () => {
      const wA = createWorkflow({ id: 'a' });
      const wB = createWorkflow({ id: 'b' });
      mockFindMissingReferencedIds.mockReturnValue(['b']);
      mockExportWorkflows.mockResolvedValue(2);

      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: allMap, onComplete })
      );

      act(() => result.current.startExport([wA]));

      await act(async () => result.current.handleAddDirect());

      await waitFor(() => {
        expect(mockExportWorkflows).toHaveBeenCalledWith([wA, wB], mockApi);
      });
    });
  });

  describe('handleAddAll', () => {
    it('should recursively resolve all transitive references', async () => {
      const wA = createWorkflow({ id: 'a' });
      const wB = createWorkflow({ id: 'b' });
      const wC = createWorkflow({ id: 'c' });
      mockFindMissingReferencedIds.mockReturnValue(['b']);
      mockResolveAllReferences.mockReturnValue([wA, wB, wC]);
      mockExportWorkflows.mockResolvedValue(3);

      const allMap = new Map([
        ['a', wA],
        ['b', wB],
        ['c', wC],
      ]);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: allMap, onComplete })
      );

      act(() => result.current.startExport([wA]));

      await act(async () => result.current.handleAddAll());

      await waitFor(() => {
        expect(mockResolveAllReferences).toHaveBeenCalledWith([wA, wB], allMap);
        expect(mockExportWorkflows).toHaveBeenCalledWith([wA, wB, wC], mockApi);
      });
    });
  });

  describe('handleCancel', () => {
    it('should close the modal without exporting', () => {
      const wA = createWorkflow({ id: 'a' });
      const wB = createWorkflow({ id: 'b' });
      mockFindMissingReferencedIds.mockReturnValue(['b']);

      const allMap = new Map([
        ['a', wA],
        ['b', wB],
      ]);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: allMap, onComplete })
      );

      act(() => result.current.startExport([wA]));
      expect(result.current.exportModalState).not.toBeNull();

      act(() => result.current.handleCancel());

      expect(result.current.exportModalState).toBeNull();
      expect(mockExportWorkflows).not.toHaveBeenCalled();
      expect(mockExportSingleWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('performExport', () => {
    it('should show warning toast when some workflows have null definitions', async () => {
      const workflows = [
        createWorkflow({ id: 'w-1' }),
        createWorkflow({ id: 'w-2', definition: null }),
      ];
      mockFindMissingReferencedIds.mockReturnValue([]);
      mockExportWorkflows.mockResolvedValue(1);

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: new Map(), onComplete })
      );

      act(() => result.current.startExport(workflows));

      await waitFor(() => {
        expect(mockExportWorkflows).toHaveBeenCalledWith(workflows, mockApi);
        expect(mockToasts.addWarning).toHaveBeenCalledWith(
          expect.stringContaining('skipped'),
          expect.any(Object)
        );
      });
    });

    it('should show error toast when export API fails', async () => {
      const workflows = [createWorkflow({ id: 'w-1' }), createWorkflow({ id: 'w-2' })];
      mockFindMissingReferencedIds.mockReturnValue([]);
      mockExportWorkflows.mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() =>
        useExportWithReferences({ allWorkflowsMap: new Map(), onComplete })
      );

      act(() => result.current.startExport(workflows));

      await waitFor(() => {
        expect(mockToasts.addError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({ title: 'Failed to export workflows' })
        );
      });
    });
  });
});
