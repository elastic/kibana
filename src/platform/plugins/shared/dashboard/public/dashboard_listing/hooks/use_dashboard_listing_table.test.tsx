/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { PAGINATION_MAX_SIZE } from '@kbn/as-code-shared-schemas';
import type { ContentListItem } from '@kbn/content-list';
import { I18nProvider } from '@kbn/i18n-react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { coreServices } from '../../services/kibana_services';
import { dashboardClient, findService } from '../../dashboard_client';
import { confirmCreateWithUnsaved } from '../confirm_overlays';
import { useDashboardListingTable } from './use_dashboard_listing_table';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import { getDashboardRecentlyAccessedService } from '../../services/dashboard_recently_accessed_service';
import { getAccessControlClient } from '../../services/access_control_service';

const clearStateMock = jest.fn();
const getDashboardUrl = jest.fn();
const goToDashboard = jest.fn();

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

jest.mock('../confirm_overlays', () => ({
  confirmCreateWithUnsaved: jest.fn().mockImplementation((fn) => fn()),
}));

jest.mock('../_dashboard_listing_strings', () => {
  const actual = jest.requireActual('../_dashboard_listing_strings');
  return {
    ...actual,
    dashboardListingTableStrings: {
      getEntityName: jest.fn().mockReturnValue('Dashboard'),
      getTableListTitle: jest.fn().mockReturnValue('Dashboard List'),
      getEntityNamePlural: jest.fn().mockReturnValue('Dashboards'),
    },
  };
});

jest.mock('../../dashboard_client', () => ({
  dashboardClient: {
    delete: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
  },
  findService: {
    findById: jest.fn(),
    search: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, per_page: 20 } }),
  },
  checkForDuplicateDashboardTitle: jest.fn(),
}));

const setShowWriteControls = (showWriteControls: boolean) => {
  coreServices.application.capabilities = {
    ...coreServices.application.capabilities,
    dashboard_v2: {
      showWriteControls,
    },
  };
};

describe('useDashboardListingTable', () => {
  const dashboardBackupService = getDashboardBackupService();
  const dashboardRecentlyAccessedService = getDashboardRecentlyAccessedService();

  beforeEach(() => {
    jest.clearAllMocks();

    dashboardBackupService.dashboardHasUnsavedEdits = jest.fn().mockReturnValue(true);
    dashboardBackupService.getDashboardIdsWithUnsavedChanges = jest.fn().mockReturnValue([]);
    dashboardBackupService.clearState = clearStateMock;

    dashboardRecentlyAccessedService.get = jest.fn().mockReturnValue([]);

    coreServices.notifications.toasts.addError = jest.fn();
    coreServices.userProfile.getCurrent = jest.fn().mockResolvedValue({ uid: 'test-user' });

    setShowWriteControls(true);
  });

  test('should return the correct refreshUnsavedDashboards function', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(typeof result.current.refreshUnsavedDashboards).toBe('function');
  });

  test('should return the correct initial unsavedDashboardIds state', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    expect(result.current.unsavedDashboardIds).toEqual([]);
  });

  test('should call deleteDashboards when deleteItems is called', async () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    await act(async () => {
      await result.current.contentListProviderProps.item?.actions?.delete?.onBulkAction?.([
        { id: 'test-id', title: 'Dashboard' },
      ]);
    });

    expect(dashboardClient.delete).toHaveBeenCalled();
    expect(getDashboardRecentlyAccessedService().remove).toHaveBeenCalledWith('test-id');
    expect(coreServices.chrome.recentlyAccessed.remove).toHaveBeenCalledWith('test-id');
  });

  test('should call goToDashboard when editItem is called', () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    act(() => {
      result.current.contentListProviderProps.item?.actions?.edit?.onItemAction?.({
        id: 'test-id',
        title: 'Dashboard',
      });
    });

    expect(goToDashboard).toHaveBeenCalled();
  });

  test('should call goToDashboard when creating without session storage integration', async () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    render(<>{result.current.emptyState}</>, { wrapper: I18nProvider });

    await userEvent.click(screen.getByRole('button', { name: 'Create dashboard' }));

    expect(goToDashboard).toHaveBeenCalled();
    expect(confirmCreateWithUnsaved).not.toHaveBeenCalled();
  });

  test('should confirm creation and clear the backup when there are unsaved changes', async () => {
    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
        useSessionStorageIntegration: true,
      })
    );

    render(<>{result.current.emptyState}</>, { wrapper: I18nProvider });

    await userEvent.click(screen.getByRole('button', { name: 'Create dashboard' }));

    expect(confirmCreateWithUnsaved).toHaveBeenCalled();
    expect(clearStateMock).toHaveBeenCalled();
    expect(goToDashboard).toHaveBeenCalled();
  });

  test('contentEditor.onSave should not include access_control in update payload', async () => {
    (findService.findById as jest.Mock).mockResolvedValue({
      id: 'test-id',
      status: 'success',
      attributes: {
        title: 'Old title',
        description: 'Old description',
        access_control: { access_mode: 'default' },
      },
    });

    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    await act(async () => {
      await result.current.contentListProviderProps.features?.contentEditor?.onSave?.({
        id: 'test-id',
        title: 'New title',
        tags: [],
      });
    });

    const payload = (dashboardClient.update as jest.Mock).mock.lastCall[1];
    expect(dashboardClient.update).toHaveBeenCalledWith(
      'test-id',
      expect.objectContaining({
        title: 'New title',
        description: 'Old description',
      })
    );

    expect(payload).not.toHaveProperty('access_control');
  });

  test('should configure Content List as read-only when showWriteControls is false', () => {
    setShowWriteControls(false);

    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );
    expect(result.current.contentListProviderProps.isReadOnly).toBe(true);
    expect(result.current.contentListProviderProps.features?.contentEditor?.isReadonly).toBe(true);
  });

  test('wires the Content List provider with the Dashboard services and features', () => {
    // `initialSort` is only set when the history is non-empty.
    dashboardRecentlyAccessedService.get = jest.fn().mockReturnValue([{ id: 'dash-1' }]);

    const { result } = renderHook(() =>
      useDashboardListingTable({
        getDashboardUrl,
        goToDashboard,
      })
    );

    const props = result.current.contentListProviderProps;

    expect(props.id).toBe('dashboard');
    expect(props.isReadOnly).toBe(false);
    expect(props.labels).toEqual({ entity: 'Dashboard', entityPlural: 'Dashboards' });

    expect(props.services).toHaveProperty('tags');
    expect(props.services).toHaveProperty('userProfiles');

    expect(props.features?.sorting).toHaveProperty('initialSort', {
      field: 'accessedAt',
      direction: 'desc',
    });
    expect(props.features?.sorting).toHaveProperty('fields.accessedAt');

    expect(props.features?.contentEditor).toHaveProperty('appendRows');

    props.item?.getHref?.({ id: 'dash-1', title: 'Dash 1', timeRestore: true });
    expect(getDashboardUrl).toHaveBeenCalledWith('dash-1', true);
  });

  test('uses the dashboard creator when checking access control', async () => {
    const accessControlClient = getAccessControlClient();
    jest.spyOn(accessControlClient, 'checkGlobalPrivilege').mockResolvedValue({
      isGloballyAuthorized: false,
    });
    const checkUserAccessControl = jest
      .spyOn(accessControlClient, 'checkUserAccessControl')
      .mockReturnValue(true);
    jest.mocked(findService.search).mockResolvedValueOnce({
      data: [
        {
          id: 'dashboard-1',
          data: {
            title: 'Dashboard',
            tags: [],
          },
          meta: {
            created_by: 'creator-id',
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-02T00:00:00.000Z',
          },
        },
      ],
      meta: {
        total: 1,
        page: 1,
        per_page: 20,
      },
    });
    const { result } = renderHook(() =>
      useDashboardListingTable({ getDashboardUrl, goToDashboard })
    );
    await act(async () => {
      await result.current.contentListProviderProps.findItems('', {
        listingLimit: 20,
      });
    });
    expect(checkUserAccessControl).toHaveBeenCalledWith({
      accessControl: {
        owner: undefined,
        accessMode: undefined,
      },
      createdBy: 'creator-id',
      userId: 'test-user',
    });
  });

  describe('findItems per_page clamping', () => {
    test('passes listingLimit directly when it is below PAGINATION_MAX_SIZE', async () => {
      // default mock returns 20 for savedObjects:listingLimit
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      await act(async () => {
        await result.current.contentListProviderProps.findItems('', {
          listingLimit: 20,
        });
      });

      expect(findService.search).toHaveBeenCalledWith(expect.objectContaining({ per_page: 20 }));
    });

    test('clamps per_page to PAGINATION_MAX_SIZE when listingLimit exceeds it', async () => {
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      await act(async () => {
        await result.current.contentListProviderProps.findItems('', {
          listingLimit: PAGINATION_MAX_SIZE + 9000,
        });
      });

      expect(findService.search).toHaveBeenCalledWith(
        expect.objectContaining({ per_page: PAGINATION_MAX_SIZE })
      );
    });
  });

  describe('action restrictions', () => {
    beforeEach(() => {
      coreServices.application.capabilities = {
        ...coreServices.application.capabilities,
        dashboard_v2: {
          showWriteControls: true,
        },
      };
    });

    test('should restrict edit and delete actions when showWriteControls is false', () => {
      setShowWriteControls(false);

      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      const editRestriction =
        result.current.contentListProviderProps.item?.actions?.edit?.restriction;
      const deleteRestriction =
        result.current.contentListProviderProps.item?.actions?.delete?.restriction;
      const item: ContentListItem = { id: 'dashboard-1', title: 'Dashboard' };

      expect(editRestriction?.(item)).toBeDefined();
      expect(deleteRestriction?.(item)).toBeDefined();
    });

    test('should restrict edit and delete actions for a managed dashboard', () => {
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      const editRestriction =
        result.current.contentListProviderProps.item?.actions?.edit?.restriction;
      const deleteRestriction =
        result.current.contentListProviderProps.item?.actions?.delete?.restriction;
      const item: ContentListItem = {
        id: 'dashboard-1',
        title: 'Dashboard',
        managed: true,
      };

      expect(editRestriction?.(item)).toBeDefined();
      expect(deleteRestriction?.(item)).toBeDefined();
    });

    test('should restrict actions when the user cannot manage a write-restricted dashboard', () => {
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      const editRestriction =
        result.current.contentListProviderProps.item?.actions?.edit?.restriction;
      const deleteRestriction =
        result.current.contentListProviderProps.item?.actions?.delete?.restriction;
      const item: ContentListItem = {
        id: 'dashboard-1',
        title: 'Dashboard',
        canManageAccessControl: false,
        accessMode: 'write_restricted',
      };

      expect(editRestriction?.(item)).toBeDefined();
      expect(deleteRestriction?.(item)).toBeDefined();
    });

    test('should allow users who can manage dashboard access to edit and delete', () => {
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      const editRestriction =
        result.current.contentListProviderProps.item?.actions?.edit?.restriction;
      const deleteRestriction =
        result.current.contentListProviderProps.item?.actions?.delete?.restriction;
      const item: ContentListItem = {
        id: 'dashboard-1',
        title: 'Dashboard',
        canManageAccessControl: true,
      };

      expect(editRestriction).toBeDefined();
      expect(deleteRestriction).toBeDefined();
      expect(editRestriction?.(item)).toBeUndefined();
      expect(deleteRestriction?.(item)).toBeUndefined();
    });

    test('should allow users without access-management permission to edit an unrestricted dashboard', () => {
      const { result } = renderHook(() =>
        useDashboardListingTable({ getDashboardUrl, goToDashboard })
      );

      const editRestriction =
        result.current.contentListProviderProps.item?.actions?.edit?.restriction;
      const deleteRestriction =
        result.current.contentListProviderProps.item?.actions?.delete?.restriction;
      const item: ContentListItem = {
        id: 'dashboard-1',
        title: 'Dashboard',
        canManageAccessControl: false,
        accessMode: 'default',
      };

      expect(editRestriction).toBeDefined();
      expect(deleteRestriction).toBeDefined();
      expect(editRestriction?.(item)).toBeUndefined();
      expect(deleteRestriction?.(item)).toBeUndefined();
    });
  });
});
