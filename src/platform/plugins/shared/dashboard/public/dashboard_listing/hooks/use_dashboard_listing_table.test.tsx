/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenContentEditorParams } from '@kbn/content-management-content-editor';
import type { ContentListItem } from '@kbn/content-list-provider';
import { renderHook, act } from '@testing-library/react';
import { coreServices } from '../../services/kibana_services';
import { dashboardClient, findService } from '../../dashboard_client';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import type { DashboardSavedObjectUserContent } from '../types';
import { useDashboardListingTable } from './use_dashboard_listing_table';
import { getDashboardBackupService } from '../../services/dashboard_api_services';

const clearStateMock = jest.fn();
const getDashboardUrl = jest.fn();
const goToDashboard = jest.fn();
const mockRecentlyAccessedGet = jest.fn().mockReturnValue([]);
const getUiSettingsMock = jest.fn().mockImplementation((key) => {
  if (key === 'savedObjects:listingLimit') {
    return 20;
  }
  if (key === 'savedObjects:perPage') {
    return 5;
  }
  return null;
});

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

jest.mock('@kbn/content-management-content-editor', () => ({
  ...jest.requireActual('@kbn/content-management-content-editor'),
  useOpenContentEditor: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock('../confirm_overlays', () => ({
  confirmCreateWithUnsaved: jest.fn().mockImplementation((fn) => fn()),
}));

jest.mock('../_dashboard_listing_strings', () => ({
  dashboardListingTableStrings: {
    getEntityName: jest.fn().mockReturnValue('Dashboard'),
    getTableListTitle: jest.fn().mockReturnValue('Dashboard List'),
    getEntityNamePlural: jest.fn().mockReturnValue('Dashboards'),
  },
  dashboardListingErrorStrings: {
    getErrorDeletingDashboardToast: jest.fn().mockReturnValue('Error deleting dashboard'),
    getDuplicateTitleWarning: jest.fn().mockReturnValue('Duplicate title'),
  },
}));

jest.mock('../../dashboard_client', () => ({
  dashboardClient: {
    delete: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
  },
  findService: {
    findById: jest.fn(),
  },
  hasLibraryItemWithTitle: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../services/dashboard_recently_accessed_service', () => ({
  getDashboardRecentlyAccessedService: () => ({
    get: mockRecentlyAccessedGet,
  }),
}));

const baseArgs = { getDashboardUrl, goToDashboard };

const itemForActions = (overrides: Partial<DashboardSavedObjectUserContent>) =>
  ({ id: 'dashboard-1', ...overrides } as unknown as ContentListItem);

describe('useDashboardListingTable', () => {
  const dashboardBackupService = getDashboardBackupService();

  beforeEach(() => {
    jest.clearAllMocks();
    dashboardBackupService.dashboardHasUnsavedEdits = jest.fn().mockReturnValue(true);
    dashboardBackupService.getDashboardIdsWithUnsavedChanges = jest.fn().mockReturnValue([]);
    dashboardBackupService.clearState = clearStateMock;
    mockRecentlyAccessedGet.mockReturnValue([]);
    coreServices.uiSettings.get = getUiSettingsMock;
    coreServices.notifications.toasts.addError = jest.fn();
    coreServices.application.capabilities = {
      ...coreServices.application.capabilities,
      dashboard_v2: { showWriteControls: true },
    };
  });

  test('returns the expected bundle shape', () => {
    const { result } = renderHook(() => useDashboardListingTable(baseArgs));

    expect(result.current).toEqual(
      expect.objectContaining({
        providerProps: expect.objectContaining({
          id: 'dashboard-listing',
          labels: { entity: 'Dashboard', entityPlural: 'Dashboards' },
          isReadOnly: false,
          findItems: expect.any(Function),
          item: expect.objectContaining({
            getHref: expect.any(Function),
            onEdit: expect.any(Function),
            onDelete: expect.any(Function),
          }),
          contentEditor: expect.objectContaining({
            openContentEditor: expect.any(Function),
            onSave: expect.any(Function),
            customValidators: expect.any(Object),
            isReadonly: false,
            appendRows: expect.any(Function),
          }),
          services: expect.objectContaining({
            favorites: expect.any(Object),
            userProfiles: expect.any(Object),
            uiSettings: expect.any(Object),
          }),
          features: expect.objectContaining({
            sorting: expect.objectContaining({
              initialSort: { field: 'updatedAt', direction: 'desc' },
            }),
            starred: true,
            tags: true,
            userProfiles: true,
            selection: true,
          }),
        }),
        itemActionGuard: {
          enabled: expect.any(Function),
          disabledReason: expect.any(Function),
        },
        emptyPrompt: expect.any(Object),
        toolbarFilters: expect.any(Object),
        createItem: expect.any(Function),
      })
    );
  });

  test('createItem is undefined when showCreateDashboardButton is false', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({ ...baseArgs, showCreateDashboardButton: false })
    );

    expect(result.current.createItem).toBeUndefined();
  });

  test('item.onDelete invokes dashboardClient.delete for each item', async () => {
    const { result } = renderHook(() => useDashboardListingTable(baseArgs));

    await act(async () => {
      await result.current.providerProps.item?.onDelete?.([
        itemForActions({ id: 'd1' }),
        itemForActions({ id: 'd2' }),
      ]);
    });

    expect(dashboardClient.delete).toHaveBeenCalledWith('d1');
    expect(dashboardClient.delete).toHaveBeenCalledWith('d2');
  });

  test('item.onEdit calls goToDashboard with edit view mode', () => {
    const { result } = renderHook(() => useDashboardListingTable(baseArgs));

    act(() => {
      result.current.providerProps.item?.onEdit?.(itemForActions({ id: 'edit-id' }));
    });

    expect(goToDashboard).toHaveBeenCalledWith('edit-id', 'edit');
  });

  test('createItem calls goToDashboard when no unsaved edits exist', () => {
    dashboardBackupService.dashboardHasUnsavedEdits = jest.fn().mockReturnValue(false);

    const { result } = renderHook(() =>
      useDashboardListingTable({ ...baseArgs, useSessionStorageIntegration: true })
    );

    act(() => {
      result.current.createItem?.();
    });

    expect(goToDashboard).toHaveBeenCalled();
    expect(confirmCreateWithUnsaved).not.toHaveBeenCalled();
  });

  test('createItem prompts confirmation and clears state when unsaved edits exist', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({ ...baseArgs, useSessionStorageIntegration: true })
    );

    act(() => {
      result.current.createItem?.();
    });

    expect(confirmCreateWithUnsaved).toHaveBeenCalled();
    expect(clearStateMock).toHaveBeenCalled();
    expect(goToDashboard).toHaveBeenCalled();
  });

  test('contentEditor.onSave omits access_control from the update payload', async () => {
    (findService.findById as jest.Mock).mockResolvedValue({
      id: 'test-id',
      status: 'success',
      attributes: {
        title: 'Old title',
        description: 'Old description',
        access_control: { access_mode: 'default' },
      },
    });

    const { result } = renderHook(() => useDashboardListingTable(baseArgs));

    await act(async () => {
      await result.current.providerProps.contentEditor?.onSave?.({
        id: 'test-id',
        title: 'New title',
      } as Parameters<Required<OpenContentEditorParams>['onSave']>[0]);
    });

    const payload = (dashboardClient.update as jest.Mock).mock.lastCall[1];
    expect(dashboardClient.update).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({ title: 'New title', description: 'Old description' })
    );
    expect(payload).not.toHaveProperty('access_control');
  });

  describe('capabilities and item handlers', () => {
    test('createItem and item handlers are gated by showWriteControls', () => {
      (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));

      expect(result.current.createItem).toBeUndefined();
      expect(result.current.providerProps.item?.onEdit).toBeUndefined();
      expect(result.current.providerProps.item?.onDelete).toBeUndefined();
      expect(result.current.providerProps.contentEditor?.isReadonly).toBe(true);
      expect(result.current.providerProps.isReadOnly).toBe(true);
    });
  });

  test('adds recently viewed as a sort field when recents are available', () => {
    mockRecentlyAccessedGet.mockReturnValue([{ id: 'dashboard-1' }]);

    const { result } = renderHook(() => useDashboardListingTable(baseArgs));

    expect(result.current.providerProps.features?.sorting).toEqual(
      expect.objectContaining({
        initialSort: { field: 'accessedAt', direction: 'desc' },
        fields: expect.arrayContaining([
          expect.objectContaining({
            field: 'accessedAt',
            descLabel: 'Recently viewed',
          }),
        ]),
      })
    );
  });

  describe('features.urlSync defaulting', () => {
    test('omits `urlSync` from features when no `urlStateEnabled` is provided', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));

      expect(result.current.providerProps.features).not.toHaveProperty('urlSync');
    });

    test('sets `urlSync` to the provided `urlStateEnabled` value', () => {
      const enabled = renderHook(() =>
        useDashboardListingTable({ ...baseArgs, urlStateEnabled: true })
      );
      expect(enabled.result.current.providerProps.features?.urlSync).toBe(true);

      const disabled = renderHook(() =>
        useDashboardListingTable({ ...baseArgs, urlStateEnabled: false })
      );
      expect(disabled.result.current.providerProps.features?.urlSync).toBe(false);
    });
  });

  describe('itemActionGuard.enabled', () => {
    test('returns false when showWriteControls is false', () => {
      (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));
      expect(result.current.itemActionGuard.enabled(itemForActions({}))).toBe(false);
    });

    test('returns false for managed items', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));
      expect(result.current.itemActionGuard.enabled(itemForActions({ managed: true }))).toBe(false);
    });

    test('returns false for write-restricted items the user cannot manage', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));
      expect(
        result.current.itemActionGuard.enabled(
          itemForActions({ canManageAccessControl: false, accessMode: 'write_restricted' })
        )
      ).toBe(false);
    });

    test('returns true when the user has write controls and no restrictions apply', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));
      expect(
        result.current.itemActionGuard.enabled(itemForActions({ canManageAccessControl: true }))
      ).toBe(true);
    });
  });

  describe('itemActionGuard.disabledReason', () => {
    test('returns the read-only reason when showWriteControls is false', () => {
      (coreServices.application.capabilities as any).dashboard_v2.showWriteControls = false;
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));

      expect(result.current.itemActionGuard.disabledReason(itemForActions({}))).toBe(
        "You don't have permissions to edit this dashboard. Contact your admin to change your role."
      );
    });

    test('returns the managed-entity reason for managed items', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));

      expect(result.current.itemActionGuard.disabledReason(itemForActions({ managed: true }))).toBe(
        'This dashboard is managed by Elastic. Duplicate it to make changes.'
      );
    });

    test('returns the access-control reason for restricted items the user cannot manage', () => {
      const { result } = renderHook(() => useDashboardListingTable(baseArgs));

      expect(
        result.current.itemActionGuard.disabledReason(
          itemForActions({ canManageAccessControl: false, accessMode: 'write_restricted' })
        )
      ).toBe("You don't have permissions to edit this dashboard. Contact the owner to change it.");
    });
  });
});
