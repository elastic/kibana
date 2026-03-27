/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { useWorkflowBulkActions } from './use_workflow_bulk_actions';
import { TestWrapper } from '../../../shared/test_utils';

const mockDeleteWorkflows = { mutate: jest.fn() };
const mockUpdateWorkflow = { mutate: jest.fn() };

jest.mock('../../../entities/workflows/model/use_workflow_actions', () => ({
  useWorkflowActions: () => ({
    deleteWorkflows: mockDeleteWorkflows,
    updateWorkflow: mockUpdateWorkflow,
  }),
}));

const mockNotifications = {
  toasts: {
    addSuccess: jest.fn(),
    addError: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
  },
};

const mockApplication = {
  capabilities: {
    workflowsManagement: {
      deleteWorkflow: true,
      updateWorkflow: true,
    },
  },
};

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      application: mockApplication,
      notifications: mockNotifications,
    },
  }),
}));

// Mock useExportWithReferences
jest.mock('./use_export_with_references', () => ({
  useExportWithReferences: () => ({
    exportModalState: null,
    startExport: jest.fn(),
    handleIgnore: jest.fn(),
    handleAddDirect: jest.fn(),
    handleAddAll: jest.fn(),
    handleCancel: jest.fn(),
  }),
}));

// Mock ExportReferencesModal
jest.mock('./export_references_modal', () => ({
  ExportReferencesModal: () => <div data-test-subj="export-references-modal" />,
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

describe('useWorkflowBulkActions', () => {
  const defaultProps = {
    selectedWorkflows: [createMockWorkflow()],
    allWorkflows: [createMockWorkflow()],
    onAction: jest.fn(),
    onActionSuccess: jest.fn(),
    deselectWorkflows: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper>{children}</TestWrapper>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns panels and modals', () => {
    const { result } = renderHook(() => useWorkflowBulkActions(defaultProps), { wrapper });
    expect(result.current.panels).toBeDefined();
    expect(result.current.modals).toBeDefined();
  });

  describe('panels', () => {
    it('includes enable action when there are disabled workflows and user can update', () => {
      const disabledWorkflow = createMockWorkflow({ id: 'wf-disabled', enabled: false });
      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [disabledWorkflow],
            allWorkflows: [disabledWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const enableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-enable'
      );
      expect(enableItem).toBeDefined();
    });

    it('includes disable action when there are enabled workflows and user can update', () => {
      const enabledWorkflow = createMockWorkflow({ id: 'wf-enabled', enabled: true });
      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [enabledWorkflow],
            allWorkflows: [enabledWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const disableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-disable'
      );
      expect(disableItem).toBeDefined();
    });

    it('includes delete action when user has delete capability', () => {
      const { result } = renderHook(() => useWorkflowBulkActions(defaultProps), { wrapper });

      const mainPanel = result.current.panels[0];
      const deleteItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-delete'
      );
      expect(deleteItem).toBeDefined();
    });

    it('includes export action when there are exportable workflows', () => {
      const { result } = renderHook(() => useWorkflowBulkActions(defaultProps), { wrapper });

      const mainPanel = result.current.panels[0];
      const exportItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-export'
      );
      expect(exportItem).toBeDefined();
    });

    it('does not include export action when no workflows have definitions', () => {
      const noDefWorkflow = createMockWorkflow({ definition: null });
      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [noDefWorkflow],
            allWorkflows: [noDefWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const exportItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-export'
      );
      expect(exportItem).toBeUndefined();
    });

    it('disables actions when no workflows are selected', () => {
      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const deleteItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-delete'
      );
      if (deleteItem && 'disabled' in deleteItem) {
        expect(deleteItem.disabled).toBe(true);
      }
    });

    it('does not include delete action when user lacks delete capability', () => {
      mockApplication.capabilities.workflowsManagement.deleteWorkflow = false;
      const { result } = renderHook(() => useWorkflowBulkActions(defaultProps), { wrapper });

      const mainPanel = result.current.panels[0];
      const deleteItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-delete'
      );
      expect(deleteItem).toBeUndefined();

      // Restore
      mockApplication.capabilities.workflowsManagement.deleteWorkflow = true;
    });

    it('does not include enable/disable actions when user lacks update capability', () => {
      mockApplication.capabilities.workflowsManagement.updateWorkflow = false;
      const disabledWorkflow = createMockWorkflow({ enabled: false });
      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [disabledWorkflow],
            allWorkflows: [disabledWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const enableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-enable'
      );
      const disableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-disable'
      );
      expect(enableItem).toBeUndefined();
      expect(disableItem).toBeUndefined();

      // Restore
      mockApplication.capabilities.workflowsManagement.updateWorkflow = true;
    });
  });

  describe('delete action', () => {
    it('calls onAction and shows the delete modal when delete is triggered', () => {
      const { result } = renderHook(() => useWorkflowBulkActions(defaultProps), { wrapper });

      const mainPanel = result.current.panels[0];
      const deleteItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-delete'
      );

      act(() => {
        if (deleteItem && 'onClick' in deleteItem && deleteItem.onClick) {
          (deleteItem.onClick as () => void)();
        }
      });

      expect(defaultProps.onAction).toHaveBeenCalled();
    });
  });

  describe('enable action', () => {
    it('calls updateWorkflow.mutate for disabled workflows when enable is triggered', () => {
      const disabledWorkflow = createMockWorkflow({ id: 'wf-disabled', enabled: false });
      const enabledWorkflow = createMockWorkflow({ id: 'wf-enabled', enabled: true });

      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [disabledWorkflow, enabledWorkflow],
            allWorkflows: [disabledWorkflow, enabledWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const enableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-enable'
      );

      act(() => {
        if (enableItem && 'onClick' in enableItem && enableItem.onClick) {
          (enableItem.onClick as () => void)();
        }
      });

      expect(defaultProps.onAction).toHaveBeenCalled();
      expect(defaultProps.deselectWorkflows).toHaveBeenCalled();
      // Should only call mutate for the disabled workflow
      expect(mockUpdateWorkflow.mutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateWorkflow.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-disabled',
          workflow: { enabled: true },
        }),
        expect.any(Object)
      );
    });
  });

  describe('disable action', () => {
    it('calls updateWorkflow.mutate for enabled workflows when disable is triggered', () => {
      const enabledWorkflow = createMockWorkflow({ id: 'wf-enabled', enabled: true });

      const { result } = renderHook(
        () =>
          useWorkflowBulkActions({
            ...defaultProps,
            selectedWorkflows: [enabledWorkflow],
            allWorkflows: [enabledWorkflow],
          }),
        { wrapper }
      );

      const mainPanel = result.current.panels[0];
      const disableItem = mainPanel.items?.find(
        (item) => 'key' in item && item.key === 'workflows-bulk-action-disable'
      );

      act(() => {
        if (disableItem && 'onClick' in disableItem && disableItem.onClick) {
          (disableItem.onClick as () => void)();
        }
      });

      expect(defaultProps.onAction).toHaveBeenCalled();
      expect(mockUpdateWorkflow.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-enabled',
          workflow: { enabled: false },
        }),
        expect.any(Object)
      );
    });
  });
});
