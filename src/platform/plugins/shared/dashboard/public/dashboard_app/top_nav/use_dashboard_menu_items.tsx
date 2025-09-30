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
import { EuiIconBackgroundTask } from '@kbn/background-search';
import { UI_SETTINGS } from '../../../common/constants';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { openSettingsFlyout } from '../../dashboard_renderer/settings/open_settings_flyout';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import type { SaveDashboardReturn } from '../../services/dashboard_content_management_service/types';
import { coreServices, shareService, dataService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings } from '../_dashboard_app_strings';
import { showAddMenu } from './add_menu/show_add_menu';
import { ShowShareModal } from './share/show_share_modal';

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
  const appId = useObservable(coreServices.application.currentAppId$);

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dashboardApi = useDashboardApi();

  const [dashboardTitle, hasOverlays, hasUnsavedChanges, lastSavedId, viewMode] =
    useBatchedPublishingSubjects(
      dashboardApi.title$,
      dashboardApi.hasOverlays$,
      dashboardApi.hasUnsavedChanges$,
      dashboardApi.savedObjectId$,
      dashboardApi.viewMode$
    );
  const disableTopNav = isSaveInProgress || hasOverlays;

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
      });
    },
    [dashboardTitle, hasUnsavedChanges, lastSavedId]
  );

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboardApi.runQuickSave().then(() => setTimeout(() => setIsSaveInProgress(false), 100));
  }, [dashboardApi]);

  /**
   * initiate interactive dashboard copy action
   */
  const dashboardInteractiveSave = useCallback(() => {
    dashboardApi.runInteractiveSave().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboardApi]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const [isResetting, setIsResetting] = useState(false);
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
        disableButton: disableTopNav,
      } as TopNavMenuData,

      quickSave: {
        ...topNavStrings.quickSave,
        id: 'quick-save',
        iconType: 'save',
        emphasize: true,
        isLoading: isSaveInProgress,
        testId: 'dashboardQuickSaveMenuItem',
        disableButton: disableTopNav || !hasUnsavedChanges,
        run: () => quickSaveDashboard(),
      } as TopNavMenuData,

      interactiveSave: {
        disableButton: disableTopNav,
        emphasize: !Boolean(lastSavedId),
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        run: dashboardInteractiveSave,
        label:
          viewMode === 'view'
            ? topNavStrings.viewModeInteractiveSave.label
            : Boolean(lastSavedId)
            ? topNavStrings.editModeInteractiveSave.label
            : topNavStrings.quickSave.label,
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
        // TODO: Replace when the backgroundTask icon is available in EUI
        iconType: EuiIconBackgroundTask,
        iconOnly: true,
        testId: 'backgroundSearchButton',
        run: () =>
          dataService.search.showSearchSessionsFlyout({
            appId,
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
    hasUnsavedChanges,
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
    appId,
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
      editModeItems.push(menuItems.interactiveSave, menuItems.switchToViewMode);

      if (showResetChange) {
        editModeItems.push(resetChangesMenuItem);
      }

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
    showResetChange,
    resetChangesMenuItem,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
