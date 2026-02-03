/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { useDashboardMenuItems } from './use_dashboard_menu_items';
import type { DashboardApi } from '../../dashboard_api/types';

// Mock services
jest.mock('../../services/kibana_services', () => ({
  coreServices: {
    application: {
      currentAppId$: new BehaviorSubject('dashboards'),
    },
    uiSettings: {
      get: jest.fn((key: string) => {
        if (key === 'labs:dashboard:enable') return false;
        return undefined;
      }),
    },
  },
  shareService: null,
  dataService: {
    search: {
      isBackgroundSearchEnabled: false,
    },
  },
}));

jest.mock('../../services/access_control_service', () => ({
  getAccessControlClient: () => ({
    isInEditAccessMode: jest.fn(() => true),
    checkUserAccessControl: jest.fn(() => true),
  }),
}));

jest.mock('../../services/dashboard_backup_service', () => ({
  getDashboardBackupService: () => ({
    storeViewMode: jest.fn(),
  }),
}));

jest.mock('../../dashboard_api/use_dashboard_api', () => ({
  useDashboardApi: jest.fn(),
}));

jest.mock('./share/use_dashboard_export_items', () => ({
  useDashboardExportItems: () => [],
}));

jest.mock('./add_menu/use_dashboard_add_items', () => ({
  useDashboardAddItems: () => [],
}));

jest.mock('../../utils/get_dashboard_capabilities', () => ({
  getDashboardCapabilities: () => ({
    showWriteControls: true,
    storeSearchSession: false,
  }),
}));

describe('useDashboardMenuItems', () => {
  const mockMaybeRedirect = jest.fn();
  const mockDashboardApi = {
    title$: new BehaviorSubject('Test Dashboard'),
    hasOverlays$: new BehaviorSubject(false),
    hasUnsavedChanges$: new BehaviorSubject(false),
    savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
    viewMode$: new BehaviorSubject<'view' | 'edit'>('edit'),
    accessControl$: new BehaviorSubject(undefined),
    runQuickSave: jest.fn().mockResolvedValue(undefined),
    runInteractiveSave: jest.fn().mockResolvedValue({ id: 'new-id' }),
    asyncResetToLastSavedState: jest.fn().mockResolvedValue(undefined),
    setViewMode: jest.fn(),
    clearOverlays: jest.fn(),
    setFullScreenMode: jest.fn(),
    changeAccessMode: jest.fn(),
    isAccessControlEnabled: false,
    isManaged: false,
    createdBy: undefined,
    user: undefined,
  } as unknown as DashboardApi;

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useDashboardApi } = require('../../dashboard_api/use_dashboard_api');
    useDashboardApi.mockReturnValue(mockDashboardApi);
  });

  describe('Save as button behavior', () => {
    it('should disable "Save as" button when dashboard is new (no lastSavedId)', () => {
      // Set up a new dashboard with no savedObjectId
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>(undefined);

      const { result } = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      const editModeConfig = result.current.editModeTopNavConfig;
      const saveButton = editModeConfig.primaryActionItem;

      expect(saveButton).toBeDefined();
      expect(saveButton?.id).toBe('save');

      // Check the split button items (which includes "Save as")
      const splitButtonProps = saveButton?.splitButtonProps;
      expect(splitButtonProps).toBeDefined();

      const saveAsItem = splitButtonProps?.items?.find((item: any) => item.id === 'save-as');
      expect(saveAsItem).toBeDefined();
      expect(saveAsItem?.disableButton).toBe(true); // Should be disabled when !lastSavedId
    });

    it('should enable "Save as" button when dashboard has been saved (has lastSavedId)', () => {
      // Set up a saved dashboard with a savedObjectId
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>('existing-id');

      const { result } = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      const editModeConfig = result.current.editModeTopNavConfig;
      const saveButton = editModeConfig.primaryActionItem;

      expect(saveButton).toBeDefined();
      expect(saveButton?.id).toBe('save');

      // Check the split button items (which includes "Save as")
      const splitButtonProps = saveButton?.splitButtonProps;
      expect(splitButtonProps).toBeDefined();

      const saveAsItem = splitButtonProps?.items?.find((item: any) => item.id === 'save-as');
      expect(saveAsItem).toBeDefined();
      expect(saveAsItem?.disableButton).toBe(false); // Should be enabled when lastSavedId exists
    });

    it('should disable "Save as" button when save is in progress even if dashboard has been saved', () => {
      // Set up a saved dashboard with a savedObjectId
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>('existing-id');

      const { result, rerender } = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      // Trigger a save operation (this would set isSaveInProgress to true internally)
      const editModeConfig = result.current.editModeTopNavConfig;
      const saveButton = editModeConfig.primaryActionItem;

      // Call the save function to trigger save in progress state
      saveButton?.run?.();

      // Force re-render to pick up state change
      rerender();

      const updatedConfig = result.current.editModeTopNavConfig;
      const updatedSaveButton = updatedConfig.primaryActionItem;
      const updatedSplitButtonProps = updatedSaveButton?.splitButtonProps;

      // During save, the save as button should be disabled
      expect(updatedSplitButtonProps?.isSecondaryButtonDisabled).toBe(true);
    });

    it('should use quick save for saved dashboards and interactive save for new dashboards', () => {
      // Test 1: New dashboard should use interactive save
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>(undefined);

      const { result } = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      let editModeConfig = result.current.editModeTopNavConfig;
      let saveButton = editModeConfig.primaryActionItem;

      expect(saveButton?.testId).toBe('dashboardInteractiveSaveMenuItem');

      // Test 2: Saved dashboard should use quick save
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>('existing-id');

      const renderResult = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      editModeConfig = renderResult.result.current.editModeTopNavConfig;
      saveButton = editModeConfig.primaryActionItem;

      expect(saveButton?.testId).toBe('dashboardQuickSaveMenuItem');
    });
  });

  describe('Reset changes button behavior', () => {
    it('should disable reset changes button when dashboard is new (no lastSavedId)', () => {
      mockDashboardApi.savedObjectId$ = new BehaviorSubject<string | undefined>(undefined);
      mockDashboardApi.hasUnsavedChanges$ = new BehaviorSubject(true);

      const { result } = renderHook(() =>
        useDashboardMenuItems({
          isLabsShown: false,
          setIsLabsShown: jest.fn(),
          maybeRedirect: mockMaybeRedirect,
        })
      );

      const editModeConfig = result.current.editModeTopNavConfig;
      const saveButton = editModeConfig.primaryActionItem;
      const splitButtonProps = saveButton?.splitButtonProps;

      const resetItem = splitButtonProps?.items?.find((item: any) => item.id === 'reset');
      expect(resetItem).toBeDefined();
      expect(resetItem?.disableButton).toBe(true); // Should be disabled when !lastSavedId
    });
  });
});
