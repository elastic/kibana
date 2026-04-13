/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import useObservable from 'react-use/lib/useObservable';
import type {
  AppMenuConfig,
  AppMenuItemType,
  AppMenuPrimaryActionItem,
} from '@kbn/core-chrome-app-menu-components';
import { useDashboardExportItems } from './share/use_dashboard_export_items';
import { getAccessControlClient } from '../../services/access_control_service';
import { UI_SETTINGS } from '../../../common/constants';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardBackupService } from '../../services/dashboard_api_services';
import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
import { coreServices, shareService, dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { useDashboardAddItems } from './add_menu/use_dashboard_add_items';

export const useDashboardMenuItems = ({
  isLabsShown,
  setIsLabsShown,
  maybeRedirect,
  showResetChange,
}: {
  isLabsShown: boolean;
  setIsLabsShown: Dispatch<SetStateAction<boolean>>;
  maybeRedirect: (result?: SaveDashboardReturn) => void;
  showResetChange?: boolean;
}) => {
  const isMounted = useMountedState();
  const accessControlClient = getAccessControlClient();
  const appId = useObservable(coreServices.application.currentAppId$);

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dashboardApi = useDashboardApi();

  const [dashboardTitle, hasOverlays, hasUnsavedChanges, lastSavedId, viewMode, accessControl] =
    useBatchedPublishingSubjects(
      dashboardApi.title$,
      dashboardApi.hasOverlays$,
      dashboardApi.hasUnsavedChanges$,
      dashboardApi.savedObjectId$,
      dashboardApi.viewMode$,
      dashboardApi.accessControl$
    );

  const disableTopNav = isSaveInProgress || hasOverlays;
  const isInEditAccessMode = accessControlClient.isInEditAccessMode(accessControl);
  const canManageAccessControl = useMemo(() => {
    const userAccessControl = accessControlClient.checkUserAccessControl({
      accessControl,
      createdBy: dashboardApi.createdBy,
      userId: dashboardApi.user?.uid,
    });
    return dashboardApi?.user?.hasGlobalAccessControlPrivilege || userAccessControl;
  }, [accessControl, accessControlClient, dashboardApi.createdBy, dashboardApi.user]);

  const isEditButtonDisabled = useMemo(() => {
    if (disableTopNav) return true;
    if (canManageAccessControl) return false;
    return !isInEditAccessMode;
  }, [disableTopNav, isInEditAccessMode, canManageAccessControl]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const [isResetting, setIsResetting] = useState(false);

  const isQuickSaveButtonDisabled = useMemo(() => {
    if (disableTopNav || isResetting) return true;
    if (dashboardApi.isAccessControlEnabled) {
      if (canManageAccessControl) return false;
      return !isInEditAccessMode;
    }
    return false;
  }, [
    canManageAccessControl,
    isInEditAccessMode,
    isResetting,
    dashboardApi.isAccessControlEnabled,
    disableTopNav,
  ]);

  const resetChanges = useCallback(
    (switchToViewMode: boolean = false) => {
      dashboardApi.clearOverlays();
      const switchModes = switchToViewMode
        ? () => {
            dashboardApi.setViewMode('view');
            getDashboardBackupService().storeViewMode('view');
          }
        : undefined;
      if (!hasUnsavedChanges) {
        switchModes?.();
        return;
      }
      confirmDiscardUnsavedChanges(async () => {
        setIsResetting(true);
        await dashboardApi.asyncResetToLastSavedState();
        if (isMounted()) {
          setIsResetting(false);
          switchModes?.();
        }
      }, viewMode);
    },
    [dashboardApi, hasUnsavedChanges, viewMode, isMounted]
  );

  /**
   * initiate interactive dashboard copy action
   */
  const dashboardInteractiveSave = useCallback(async () => {
    const result = await dashboardApi.runInteractiveSave();
    maybeRedirect(result);
    if (result && !result.error) {
      return result;
    }
  }, [maybeRedirect, dashboardApi]);

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboardApi.runQuickSave().then(() =>
      setTimeout(() => {
        setIsSaveInProgress(false);
      }, 100)
    );
  }, [dashboardApi]);

  const saveFromShareModal = useCallback(async () => {
    if (lastSavedId) {
      quickSaveDashboard();
    } else {
      dashboardInteractiveSave();
    }
  }, [quickSaveDashboard, dashboardInteractiveSave, lastSavedId]);

  const addMenuItems = useDashboardAddItems({ dashboardApi });

  const exportItems = useDashboardExportItems({
    dashboardApi,
    objectId: lastSavedId,
    isDirty: Boolean(hasUnsavedChanges),
    dashboardTitle,
  });

  const hasExportMenuItems = exportItems.length > 0;

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(() => {
    ShowShareModal({
      dashboardTitle,
      savedObjectId: lastSavedId,
      isDirty: Boolean(hasUnsavedChanges) && viewMode === 'edit',
      canSave: (canManageAccessControl || isInEditAccessMode) && Boolean(hasUnsavedChanges),
      accessControl,
      createdBy: dashboardApi.createdBy,
      isManaged: dashboardApi.isManaged,
      accessControlClient,
      saveDashboard: saveFromShareModal,
      changeAccessMode: dashboardApi.changeAccessMode,
    });
  }, [
    dashboardTitle,
    hasUnsavedChanges,
    lastSavedId,
    isInEditAccessMode,
    canManageAccessControl,
    accessControl,
    saveFromShareModal,
    dashboardApi.changeAccessMode,
    dashboardApi.createdBy,
    accessControlClient,
    dashboardApi.isManaged,
    viewMode,
  ]);

  const getEditTooltip = useCallback(() => {
    if (dashboardApi.isManaged) {
      return topNavStrings.edit.managedDashboardTooltip;
    }
    if (isInEditAccessMode || canManageAccessControl) {
      return undefined;
    }
    return topNavStrings.edit.writeRestrictedTooltip;
  }, [isInEditAccessMode, canManageAccessControl, dashboardApi.isManaged]);

  const getShareTooltip = useCallback(() => {
    if (!dashboardApi.isAccessControlEnabled) return undefined;
    return isInEditAccessMode
      ? topNavStrings.share.editModeTooltipContent
      : topNavStrings.share.writeRestrictedModeTooltipContent;
  }, [isInEditAccessMode, dashboardApi.isAccessControlEnabled]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      order: viewMode === 'edit' ? 2 : 4,
      label: topNavStrings.resetChanges.label,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
      iconType: 'undo',
      disableButton:
        isResetting ||
        !hasUnsavedChanges ||
        hasOverlays ||
        (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)) ||
        !lastSavedId, // Disable when on a new dashboard
      isLoading: isResetting,
      run: () => resetChanges(),
    };
  }, [
    hasOverlays,
    lastSavedId,
    resetChanges,
    viewMode,
    isSaveInProgress,
    hasUnsavedChanges,
    isResetting,
  ]);

  /**
   * Register all of the top nav configs that can be used by dashboard.
   */

  const menuItems = useMemo(() => {
    const exportMenuItem: AppMenuItemType =
      exportItems.length === 1
        ? {
            order: viewMode === 'edit' ? 4 : 2,
            label: topNavStrings.export.label,
            id: 'export',
            iconType: 'exportAction',
            testId: 'exportTopNavButton',
            disableButton: disableTopNav,
            run: (params) => exportItems[0].run?.(params),
          }
        : {
            order: viewMode === 'edit' ? 4 : 2,
            label: topNavStrings.export.label,
            id: 'export',
            iconType: 'exportAction',
            testId: 'exportTopNavButton',
            disableButton: disableTopNav,
            items: exportItems,
            popoverWidth: 160,
            popoverTestId: 'exportPopoverPanel',
          };

    return {
      // Regular menu items
      share: {
        order: viewMode === 'edit' ? 3 : 1,
        label: topNavStrings.share.label,
        tooltipContent: getShareTooltip(),
        tooltipTitle: topNavStrings.share.tooltipTitle,
        id: 'share',
        iconType: 'share',
        testId: 'shareTopNavButton',
        disableButton: disableTopNav,
        run: () => showShare(),
      } as AppMenuItemType,

      export: exportMenuItem,

      duplicate: {
        order: 3,
        disableButton: disableTopNav,
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        iconType: 'copy',
        run: dashboardInteractiveSave,
        label: topNavStrings.viewModeInteractiveSave.label,
      } as AppMenuItemType,

      backgroundSearch: {
        order: viewMode === 'edit' ? 6 : 5,
        label: topNavStrings.backgroundSearch.label,
        id: 'backgroundSearch',
        iconType: 'backgroundTask',
        testId: 'openBackgroundSearchFlyoutButton',
        run: () =>
          dataService.search.showSearchSessionsFlyout({
            appId: appId!,
            trackingProps: { openedFrom: 'background search button' },
          }),
      } as AppMenuItemType,

      fullScreen: {
        order: 6,
        label: topNavStrings.fullScreen.label,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        iconType: 'fullScreen',
        run: () => dashboardApi.setFullScreenMode(true),
        disableButton: disableTopNav,
      } as AppMenuItemType,

      switchToViewMode: {
        order: 1,
        iconType: 'logOut', // use 'logOut' when added to EUI
        label: topNavStrings.switchToViewMode.label,
        id: 'cancel',
        disableButton: disableTopNav || !lastSavedId || isResetting,
        isLoading: isResetting,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as AppMenuItemType,

      add: {
        label: topNavStrings.add.label,
        id: 'add',
        iconType: 'plus',
        testId: 'dashboardAddTopNavButton',
        htmlId: 'dashboardAddTopNavButton',
        disableButton: disableTopNav,
        popoverWidth: 200,
        items: addMenuItems,
        order: 2,
      } as AppMenuItemType,

      settings: {
        order: 5,
        iconType: 'gear',
        label: topNavStrings.settings.label,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        htmlId: 'dashboardSettingsButton',
        run: () => openSettingsFlyout(dashboardApi),
      } as AppMenuItemType,

      // Action items
      edit: {
        label: topNavStrings.edit.label,
        id: 'edit',
        iconType: 'pencil',
        testId: 'dashboardEditMode',
        hidden: ['s', 'xs'], // hide for small screens - editing doesn't work in mobile mode.
        run: () => {
          getDashboardBackupService().storeViewMode('edit');
          dashboardApi.setViewMode('edit');
          dashboardApi.clearOverlays();
        },
        disableButton: isEditButtonDisabled,
        tooltipContent: getEditTooltip(),
        color: 'text',
      } as AppMenuPrimaryActionItem,

      save: {
        label: topNavStrings.quickSave.label,
        id: 'save',
        iconType: 'save',
        testId: lastSavedId ? 'dashboardQuickSaveMenuItem' : 'dashboardInteractiveSaveMenuItem',
        disableButton: lastSavedId ? isQuickSaveButtonDisabled : disableTopNav, // Only check disableTopNav for new dashboards
        run: () => (lastSavedId ? quickSaveDashboard() : dashboardInteractiveSave()),
        popoverWidth: 150,
        splitButtonProps: {
          items: [
            {
              id: 'save-as',
              label: topNavStrings.editModeInteractiveSave.label,
              iconType: 'save',
              order: 1,
              testId: 'dashboardInteractiveSaveMenuItem',
              disableButton: isSaveInProgress || !lastSavedId, // Disable when on a new dashboard
              run: () => dashboardInteractiveSave(),
            },
            resetChangesMenuItem,
          ],
          isMainButtonLoading: isSaveInProgress,
          secondaryButtonAriaLabel: topNavStrings.saveMenu.label,
          secondaryButtonIcon: 'chevronSingleDown',
          secondaryButtonFill: true,
          isSecondaryButtonDisabled: isSaveInProgress,
          notifcationIndicatorTooltipContent: topNavStrings.unsavedChangesTooltip,
          showNotificationIndicator: hasUnsavedChanges,
        },
      } as AppMenuPrimaryActionItem,

      // Labs item
      labs: {
        order: 7,
        label: topNavStrings.labs.label,
        id: 'labs',
        testId: 'dashboardLabs',
        run: () => setIsLabsShown(!isLabsShown),
      } as AppMenuItemType,
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    lastSavedId,
    dashboardInteractiveSave,
    showShare,
    dashboardApi,
    setIsLabsShown,
    isLabsShown,
    quickSaveDashboard,
    resetChanges,
    isResetting,
    isEditButtonDisabled,
    getEditTooltip,
    getShareTooltip,
    appId,
    isQuickSaveButtonDisabled,
    hasUnsavedChanges,
    addMenuItems,
    resetChangesMenuItem,
    exportItems,
    viewMode,
  ]);

  /**
   * Build ordered menus for view and edit mode.
   */
  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);

  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls, storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [menuItems.fullScreen];

    if (showWriteControls) {
      items.push(menuItems.duplicate);
    }

    if (shareService) {
      items.push(menuItems.share);
      if (hasExportMenuItems) {
        // only render the export button if we have integrations
        items.push(menuItems.export);
      }
    }

    if (showResetChange) {
      items.push(resetChangesMenuItem);
    }

    if (storeSearchSession && dataService.search.isBackgroundSearchEnabled) {
      items.push(menuItems.backgroundSearch);
    }

    if (isLabsEnabled) {
      items.push(menuItems.labs);
    }

    const viewModeConfig: AppMenuConfig = {
      items,
    };

    if (showWriteControls && !dashboardApi.isManaged) {
      viewModeConfig.primaryActionItem = menuItems.edit;
    }

    return viewModeConfig;
  }, [
    menuItems.fullScreen,
    menuItems.duplicate,
    menuItems.export,
    menuItems.share,
    menuItems.edit,
    menuItems.backgroundSearch,
    menuItems.labs,
    resetChangesMenuItem,
    dashboardApi.isManaged,
    showResetChange,
    isLabsEnabled,
    hasExportMenuItems,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const { storeSearchSession } = getDashboardCapabilities();

    const items: AppMenuItemType[] = [
      menuItems.add,
      menuItems.switchToViewMode,
      menuItems.settings,
    ];

    if (shareService) {
      items.push(menuItems.share);
      if (hasExportMenuItems) {
        // only render the export button if we have integrations
        items.push(menuItems.export);
      }
    }

    if (storeSearchSession && dataService.search.isBackgroundSearchEnabled) {
      items.push(menuItems.backgroundSearch);
    }

    if (isLabsEnabled) {
      items.push(menuItems.labs);
    }

    const editModeConfig: AppMenuConfig = {
      items,
      primaryActionItem: menuItems.save,
    };

    return editModeConfig;
  }, [
    menuItems.switchToViewMode,
    menuItems.export,
    menuItems.share,
    menuItems.settings,
    menuItems.backgroundSearch,
    menuItems.save,
    menuItems.labs,
    menuItems.add,
    hasExportMenuItems,
    isLabsEnabled,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
