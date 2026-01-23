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

import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import useObservable from 'react-use/lib/useObservable';
import { getAccessControlClient } from '../../services/access_control_service';
import { UI_SETTINGS } from '../../../common/constants';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import type { SaveDashboardReturn } from '../../dashboard_api/save_modal/types';
import { coreServices, shareService, dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings } from '../_dashboard_app_strings';
import { showAddMenu } from './add_menu/show_add_menu';
import { ShowShareModal } from './share/show_share_modal';
import { showSaveMenu } from './save_menu/show_save_menu';

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
  const isCreatingNewDashboard = viewMode === 'edit' && !lastSavedId;

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

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(
    (anchorElement: HTMLElement, asExport?: boolean) => {
      ShowShareModal({
        asExport,
        dashboardTitle,
        anchorElement,
        savedObjectId: lastSavedId,
        isDirty: Boolean(hasUnsavedChanges),
        canSave: (canManageAccessControl || isInEditAccessMode) && Boolean(hasUnsavedChanges),
        accessControl,
        createdBy: dashboardApi.createdBy,
        isManaged: dashboardApi.isManaged,
        accessControlClient,
        saveDashboard: saveFromShareModal,
        changeAccessMode: dashboardApi.changeAccessMode,
      });
    },
    [
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
    ]
  );

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

  /**
   * Register all of the top nav configs that can be used by dashboard.
   */

  const menuItems = useMemo(() => {
    return {
      fullScreen: {
        ...topNavStrings.fullScreen,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        run: () => dashboardApi.setFullScreenMode(true),
        disableButton: disableTopNav,
      } as TopNavMenuData,

      labs: {
        ...topNavStrings.labs,
        id: 'labs',
        testId: 'dashboardLabs',
        run: () => setIsLabsShown(!isLabsShown),
      } as TopNavMenuData,

      edit: {
        ...topNavStrings.edit,
        emphasize: true,
        id: 'edit',
        iconType: 'pencil',
        testId: 'dashboardEditMode',
        className: 'eui-hideFor--s eui-hideFor--xs', // hide for small screens - editing doesn't work in mobile mode.
        run: () => {
          getDashboardBackupService().storeViewMode('edit');
          dashboardApi.setViewMode('edit');
          dashboardApi.clearOverlays();
        },
        disableButton: isEditButtonDisabled,
        tooltip: getEditTooltip(),
      } as TopNavMenuData,

      quickSave: {
        ...topNavStrings.quickSave,
        id: 'quick-save',
        iconType: 'save',
        emphasize: true,
        fill: true,
        testId: 'dashboardQuickSaveMenuItem',
        disableButton: isQuickSaveButtonDisabled,
        run: () => quickSaveDashboard(),
        splitButtonProps: {
          run: (anchorElement: HTMLElement) => {
            showSaveMenu({
              dashboardApi,
              anchorElement,
              resetChanges,
              isResetting,
              isSaveInProgress,
              dashboardInteractiveSave,
              coreServices,
            });
          },
          isMainButtonLoading: isSaveInProgress,
          isMainButtonDisabled: !hasUnsavedChanges,
          secondaryButtonAriaLabel: topNavStrings.saveMenu.label,
          secondaryButtonIcon: 'arrowDown',
          secondaryButtonFill: true,
          isSecondaryButtonDisabled: isSaveInProgress,
        },
      } as TopNavMenuData,

      interactiveSave: {
        disableButton: disableTopNav,
        emphasize: isCreatingNewDashboard,
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        iconType: lastSavedId ? undefined : 'save',
        run: dashboardInteractiveSave,
        label: isCreatingNewDashboard
          ? topNavStrings.quickSave.label
          : topNavStrings.viewModeInteractiveSave.label,
        description:
          viewMode === 'view'
            ? topNavStrings.viewModeInteractiveSave.description
            : topNavStrings.editModeInteractiveSave.description,
      } as TopNavMenuData,

      switchToViewMode: {
        ...topNavStrings.switchToViewMode,
        id: 'cancel',
        disableButton: disableTopNav || !lastSavedId || isResetting,
        isLoading: isResetting,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as TopNavMenuData,

      backgroundSearch: {
        ...topNavStrings.backgroundSearch,
        id: 'backgroundSearch',
        iconType: 'backgroundTask',
        iconOnly: true,
        testId: 'openBackgroundSearchFlyoutButton',
        run: () =>
          dataService.search.showSearchSessionsFlyout({
            appId: appId!,
            trackingProps: { openedFrom: 'background search button' },
          }),
      } as TopNavMenuData,

      share: {
        ...topNavStrings.share,
        id: 'share',
        iconType: 'share',
        iconOnly: true,
        testId: 'shareTopNavButton',
        disableButton: disableTopNav,
        run: showShare,
        tooltip: getShareTooltip(),
      } as TopNavMenuData,

      export: {
        ...topNavStrings.export,
        id: 'export',
        iconType: 'download',
        iconOnly: true,
        testId: 'exportTopNavButton',
        disableButton: disableTopNav,
        run: (anchorElement) => showShare(anchorElement, true),
      } as TopNavMenuData,

      settings: {
        ...topNavStrings.settings,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        htmlId: 'dashboardSettingsButton',
        run: () => openSettingsFlyout(dashboardApi),
      },

      add: {
        ...topNavStrings.add,
        id: 'add',
        iconType: 'plusInCircle',
        color: 'success',
        fill: false,
        emphasize: true,
        type: 'button',
        testId: 'dashboardAddTopNavButton',
        htmlId: 'dashboardAddTopNavButton',
        disableButton: disableTopNav,
        run: (anchorElement: HTMLElement) =>
          showAddMenu({ dashboardApi, anchorElement, coreServices }),
      },
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    isCreatingNewDashboard,
    lastSavedId,
    dashboardInteractiveSave,
    viewMode,
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
  ]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      ...topNavStrings.resetChanges,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
      disableButton:
        isResetting ||
        !hasUnsavedChanges ||
        hasOverlays ||
        (viewMode === 'edit' && (isSaveInProgress || !lastSavedId)),
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
   * Build ordered menus for view and edit mode.
   */
  const isLabsEnabled = useMemo(() => coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI), []);

  const hasExportIntegration = useMemo(() => {
    if (!shareService) return false;
    return shareService.availableIntegrations('dashboard', 'export').length > 0;
  }, []);

  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls, storeSearchSession } = getDashboardCapabilities();

    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService
      ? ([
          // Only show the export button if the current user meets the requirements for at least one registered export integration
          hasExportIntegration ? menuItems.export : null,
          menuItems.share,
        ].filter(Boolean) as TopNavMenuData[])
      : [];
    const duplicateMenuItem = showWriteControls ? [menuItems.interactiveSave] : [];
    const editMenuItem = showWriteControls && !dashboardApi.isManaged ? [menuItems.edit] : [];
    const mayberesetChangesMenuItem = showResetChange ? [resetChangesMenuItem] : [];
    const backgroundSearch =
      storeSearchSession && dataService.search.isBackgroundSearchEnabled
        ? [menuItems.backgroundSearch]
        : [];

    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...duplicateMenuItem,
      ...mayberesetChangesMenuItem,
      ...backgroundSearch,
      ...shareMenuItem,
      ...editMenuItem,
    ];
  }, [
    isLabsEnabled,
    menuItems.labs,
    menuItems.export,
    menuItems.share,
    menuItems.interactiveSave,
    menuItems.edit,
    menuItems.fullScreen,
    menuItems.backgroundSearch,
    hasExportIntegration,
    dashboardApi.isManaged,
    showResetChange,
    resetChangesMenuItem,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const { storeSearchSession } = getDashboardCapabilities();

    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService
      ? ([
          // Only show the export button if the current user meets the requirements for at least one registered export integration
          hasExportIntegration ? menuItems.export : null,
          menuItems.share,
        ].filter(Boolean) as TopNavMenuData[])
      : [];

    const editModeItems: TopNavMenuData[] = [];

    if (lastSavedId) {
      editModeItems.push(menuItems.switchToViewMode);

      editModeItems.push(menuItems.add, menuItems.quickSave);
    } else {
      editModeItems.push(menuItems.switchToViewMode, menuItems.add, menuItems.interactiveSave);
    }

    const editModeTopNavConfigItems = [...labsMenuItem, menuItems.settings, ...editModeItems];
    const backgroundSearch =
      storeSearchSession && dataService.search.isBackgroundSearchEnabled
        ? [menuItems.backgroundSearch]
        : [];

    // insert share menu item before the last item in edit mode
    editModeTopNavConfigItems.splice(-2, 0, ...backgroundSearch, ...shareMenuItem);

    return editModeTopNavConfigItems;
  }, [
    isLabsEnabled,
    menuItems.labs,
    menuItems.export,
    menuItems.share,
    menuItems.settings,
    menuItems.interactiveSave,
    menuItems.switchToViewMode,
    menuItems.quickSave,
    menuItems.add,
    menuItems.backgroundSearch,
    hasExportIntegration,
    lastSavedId,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
