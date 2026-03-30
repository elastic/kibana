/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { useExportWithReferences } from './use_export_with_references';

const mockNotifications = {
  toasts: {
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addError: jest.fn(),
  },
};

const mockReportWorkflowExported = jest.fn();

const mockApi = {
  exportWorkflows: jest.fn(),
};

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => mockApi,
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      notifications: mockNotifications,
    },
  }),
}));

jest.mock('../../../hooks/use_telemetry', () => ({
  useTelemetry: () => ({
    reportWorkflowExported: mockReportWorkflowExported,
  }),
}));

// Mock export_workflows module
const mockExportWorkflows = jest.fn();
const mockExportSingleWorkflow = jest.fn();
const mockFindMissingReferencedIds = jest.fn();
const mockResolveAllReferences = jest.fn();

jest.mock('../../../common/lib/export_workflows', () => ({
  exportWorkflows: (...args: unknown[]) => mockExportWorkflows(...args),
  exportSingleWorkflow: (...args: unknown[]) => mockExportSingleWorkflow(...args),
  findMissingReferencedIds: (...args: unknown[]) => mockFindMissingReferencedIds(...args),
  resolveAllReferences: (...args: unknown[]) => mockResolveAllReferences(...args),
}));

const createMockWorkflow = (overrides: Partial<WorkflowListItemDto> = {}): WorkflowListItemDto => ({
  id: 'wf-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  definition: {
    version: '1',
    name: 'Test Workflow',
    enabled: true,
    triggers: [],
    steps: [],
  },
  createdAt: '2024-01-01T00:00:00Z',
  history: [],
  valid: true,
  ...overrides,
});

describe('useExportWithReferences', () => {
  const allWorkflowsMap = new Map<string, WorkflowListItemDto>();
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    allWorkflowsMap.clear();
    mockFindMissingReferencedIds.mockReturnValue([]);
  });

  it('returns initial state with no export modal', () => {
    const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));
    expect(result.current.exportModalState).toBeNull();
  });

  describe('startExport', () => {
    it('exports a single workflow as YAML without showing a modal', () => {
      mockFindMissingReferencedIds.mockReturnValue([]);

      const workflow = createMockWorkflow();
      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([workflow]);
      });

      expect(mockExportSingleWorkflow).toHaveBeenCalledWith(workflow);
      expect(mockNotifications.toasts.addSuccess).toHaveBeenCalled();
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCount: 1,
          format: 'yaml',
          referenceResolution: 'none',
        })
      );
      expect(onComplete).toHaveBeenCalled();
    });

    it('exports multiple workflows as ZIP when no references are missing', async () => {
      mockFindMissingReferencedIds.mockReturnValue([]);
      mockExportWorkflows.mockResolvedValue(2);

      const workflows = [createMockWorkflow({ id: 'wf-1' }), createMockWorkflow({ id: 'wf-2' })];
      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      await act(async () => {
        result.current.startExport(workflows);
      });

      expect(mockExportWorkflows).toHaveBeenCalledWith(workflows, mockApi);
      expect(mockNotifications.toasts.addSuccess).toHaveBeenCalled();
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowCount: 2,
          format: 'zip',
          referenceResolution: 'none',
        })
      );
    });

    it('shows the references modal when there are missing references', () => {
      const mainWorkflow = createMockWorkflow({ id: 'wf-main' });
      const referencedWorkflow = createMockWorkflow({ id: 'wf-ref', name: 'Referenced Workflow' });

      allWorkflowsMap.set('wf-main', mainWorkflow);
      allWorkflowsMap.set('wf-ref', referencedWorkflow);

      mockFindMissingReferencedIds.mockReturnValue(['wf-ref']);

      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([mainWorkflow]);
      });

      expect(result.current.exportModalState).not.toBeNull();
      expect(result.current.exportModalState?.missingWorkflows).toEqual([referencedWorkflow]);
      expect(result.current.exportModalState?.pendingExport).toEqual([mainWorkflow]);
    });

    it('exports without modal when missing IDs are not found in allWorkflowsMap', () => {
      mockFindMissingReferencedIds.mockReturnValue(['wf-unknown']);
      // allWorkflowsMap does NOT have 'wf-unknown'

      const workflow = createMockWorkflow();
      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([workflow]);
      });

      // Should fall through to exportWithoutReferences because missingWorkflows is empty
      expect(result.current.exportModalState).toBeNull();
      expect(mockExportSingleWorkflow).toHaveBeenCalled();
    });
  });

  describe('handleIgnore', () => {
    it('exports pending workflows without references and clears the modal', async () => {
      const mainWorkflow = createMockWorkflow({ id: 'wf-main' });
      const referencedWorkflow = createMockWorkflow({ id: 'wf-ref' });

      allWorkflowsMap.set('wf-main', mainWorkflow);
      allWorkflowsMap.set('wf-ref', referencedWorkflow);

      mockFindMissingReferencedIds.mockReturnValue(['wf-ref']);
      mockExportWorkflows.mockResolvedValue(1);

      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([mainWorkflow]);
      });

      expect(result.current.exportModalState).not.toBeNull();

      await act(async () => {
        result.current.handleIgnore();
      });

      expect(result.current.exportModalState).toBeNull();
      expect(mockExportWorkflows).toHaveBeenCalledWith([mainWorkflow], mockApi);
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({ referenceResolution: 'ignore' })
      );
    });
  });

  describe('handleAddDirect', () => {
    it('exports pending + missing workflows and clears the modal', async () => {
      const mainWorkflow = createMockWorkflow({ id: 'wf-main' });
      const referencedWorkflow = createMockWorkflow({ id: 'wf-ref' });

      allWorkflowsMap.set('wf-main', mainWorkflow);
      allWorkflowsMap.set('wf-ref', referencedWorkflow);

      mockFindMissingReferencedIds.mockReturnValue(['wf-ref']);
      mockExportWorkflows.mockResolvedValue(2);

      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([mainWorkflow]);
      });

      await act(async () => {
        result.current.handleAddDirect();
      });

      expect(result.current.exportModalState).toBeNull();
      expect(mockExportWorkflows).toHaveBeenCalledWith([mainWorkflow, referencedWorkflow], mockApi);
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({ referenceResolution: 'add_direct' })
      );
    });
  });

  describe('handleAddAll', () => {
    it('resolves all references and exports them', async () => {
      const mainWorkflow = createMockWorkflow({ id: 'wf-main' });
      const referencedWorkflow = createMockWorkflow({ id: 'wf-ref' });
      const transitiveWorkflow = createMockWorkflow({ id: 'wf-transitive' });

      allWorkflowsMap.set('wf-main', mainWorkflow);
      allWorkflowsMap.set('wf-ref', referencedWorkflow);
      allWorkflowsMap.set('wf-transitive', transitiveWorkflow);

      mockFindMissingReferencedIds.mockReturnValue(['wf-ref']);
      mockResolveAllReferences.mockReturnValue([
        mainWorkflow,
        referencedWorkflow,
        transitiveWorkflow,
      ]);
      mockExportWorkflows.mockResolvedValue(3);

      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([mainWorkflow]);
      });

      await act(async () => {
        result.current.handleAddAll();
      });

      expect(result.current.exportModalState).toBeNull();
      expect(mockResolveAllReferences).toHaveBeenCalled();
      expect(mockExportWorkflows).toHaveBeenCalledWith(
        [mainWorkflow, referencedWorkflow, transitiveWorkflow],
        mockApi
      );
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({ referenceResolution: 'add_all' })
      );
    });
  });

  describe('handleCancel', () => {
    it('clears the modal state without exporting', () => {
      const mainWorkflow = createMockWorkflow({ id: 'wf-main' });
      const referencedWorkflow = createMockWorkflow({ id: 'wf-ref' });

      allWorkflowsMap.set('wf-main', mainWorkflow);
      allWorkflowsMap.set('wf-ref', referencedWorkflow);

      mockFindMissingReferencedIds.mockReturnValue(['wf-ref']);

      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      act(() => {
        result.current.startExport([mainWorkflow]);
      });

      expect(result.current.exportModalState).not.toBeNull();

      act(() => {
        result.current.handleCancel();
      });

      expect(result.current.exportModalState).toBeNull();
      expect(mockExportWorkflows).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('shows an error toast and reports telemetry when export fails', async () => {
      mockFindMissingReferencedIds.mockReturnValue([]);
      const exportError = new Error('Export failed');
      mockExportWorkflows.mockRejectedValue(exportError);

      const workflows = [createMockWorkflow({ id: 'wf-1' }), createMockWorkflow({ id: 'wf-2' })];
      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      await act(async () => {
        result.current.startExport(workflows);
      });

      expect(mockNotifications.toasts.addError).toHaveBeenCalledWith(
        exportError,
        expect.objectContaining({
          title: 'Failed to export workflows',
        })
      );
      expect(mockReportWorkflowExported).toHaveBeenCalledWith(
        expect.objectContaining({
          error: exportError,
        })
      );
    });

    it('shows a warning toast when some workflows were skipped', async () => {
      mockFindMissingReferencedIds.mockReturnValue([]);
      // Return 1 exported out of 2 provided => 1 was skipped
      mockExportWorkflows.mockResolvedValue(1);

      const workflows = [createMockWorkflow({ id: 'wf-1' }), createMockWorkflow({ id: 'wf-2' })];
      const { result } = renderHook(() => useExportWithReferences({ allWorkflowsMap, onComplete }));

      await act(async () => {
        result.current.startExport(workflows);
      });

      expect(mockNotifications.toasts.addWarning).toHaveBeenCalled();
    });
  });
});
