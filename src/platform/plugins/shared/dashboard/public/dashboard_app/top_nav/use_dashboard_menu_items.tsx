/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';

import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import useMountedState from 'react-use/lib/useMountedState';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { UI_SETTINGS } from '../../../common';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { CHANGE_CHECK_DEBOUNCE } from '../../dashboard_constants';
import { openSettingsFlyout } from '../../dashboard_container/embeddable/api';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { getDashboardBackupService } from '../../services/dashboard_backup_service';
import { SaveDashboardReturn } from '../../services/dashboard_content_management_service/types';
import { coreServices, shareService } from '../../services/kibana_services';
import { getDashboardCapabilities } from '../../utils/get_dashboard_capabilities';
import { topNavStrings } from '../_dashboard_app_strings';
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

  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const dashboardApi = useDashboardApi();

  const [dashboardTitle, hasOverlays, hasUnsavedChanges, lastSavedId, viewMode] =
    useBatchedPublishingSubjects(
      dashboardApi.panelTitle,
      dashboardApi.hasOverlays$,
      dashboardApi.hasUnsavedChanges$,
      dashboardApi.savedObjectId,
      dashboardApi.viewMode
    );
  const disableTopNav = isSaveInProgress || hasOverlays;

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(
    (anchorElement: HTMLElement) => {
      ShowShareModal({
        dashboardTitle,
        anchorElement,
        savedObjectId: lastSavedId,
        isDirty: Boolean(hasUnsavedChanges),
        getPanelsState: () => dashboardApi.panels$.value,
      });
    },
    [dashboardTitle, hasUnsavedChanges, lastSavedId, dashboardApi]
  );

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboardApi
      .runQuickSave()
      .then(() => setTimeout(() => setIsSaveInProgress(false), CHANGE_CHECK_DEBOUNCE));
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

      share: {
        ...topNavStrings.share,
        id: 'share',
        testId: 'shareTopNavButton',
        disableButton: disableTopNav,
        run: showShare,
      } as TopNavMenuData,

      settings: {
        ...topNavStrings.settings,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: disableTopNav,
        run: () => openSettingsFlyout(dashboardApi),
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

  const viewModeTopNavConfig = useMemo(() => {
    const { showWriteControls } = getDashboardCapabilities();

    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService ? [menuItems.share] : [];
    const duplicateMenuItem = showWriteControls ? [menuItems.interactiveSave] : [];
    const editMenuItem = showWriteControls && !dashboardApi.isManaged ? [menuItems.edit] : [];
    const mayberesetChangesMenuItem = showResetChange ? [resetChangesMenuItem] : [];

    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...shareMenuItem,
      ...duplicateMenuItem,
      ...mayberesetChangesMenuItem,
      ...editMenuItem,
    ];
  }, [isLabsEnabled, menuItems, dashboardApi.isManaged, showResetChange, resetChangesMenuItem]);

  const editModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = shareService ? [menuItems.share] : [];
    const editModeItems: TopNavMenuData[] = [];

    if (lastSavedId) {
      editModeItems.push(menuItems.interactiveSave, menuItems.switchToViewMode);

      if (showResetChange) {
        editModeItems.push(resetChangesMenuItem);
      }

      editModeItems.push(menuItems.quickSave);
    } else {
      editModeItems.push(menuItems.switchToViewMode, menuItems.interactiveSave);
    }
    return [...labsMenuItem, menuItems.settings, ...shareMenuItem, ...editModeItems];
  }, [isLabsEnabled, menuItems, lastSavedId, showResetChange, resetChangesMenuItem]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
