/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { batch } from 'react-redux';
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import useMountedState from 'react-use/lib/useMountedState';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { UI_SETTINGS } from '../../../common';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { pluginServices } from '../../services/plugin_services';
import { CHANGE_CHECK_DEBOUNCE } from '../../dashboard_constants';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';
import { SaveDashboardReturn } from '../../services/dashboard_content_management/types';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../services/kibana_services';

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

  /**
   * Unpack dashboard services
   */
  const {
    share,
    dashboardBackup,
    dashboardCapabilities: { showWriteControls },
  } = pluginServices.getServices();
  const isLabsEnabled = coreServices.uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);

  /**
   * Unpack dashboard state from redux
   */
  const dashboardApi = useDashboardApi();

  const [
    dashboardTitle,
    hasOverlays,
    hasRunMigrations,
    hasUnsavedChanges,
    lastSavedId,
    managed,
    viewMode,
  ] = useBatchedPublishingSubjects(
    dashboardApi.panelTitle,
    dashboardApi.hasOverlays$,
    dashboardApi.hasRunMigrations$,
    dashboardApi.hasUnsavedChanges$,
    dashboardApi.savedObjectId,
    dashboardApi.managed$,
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
        getPanelsState: dashboardApi.getPanelsState,
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
    dashboardApi.runInteractiveSave(viewMode).then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboardApi, viewMode]);

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
            dashboardApi.setViewMode(ViewMode.VIEW);
            dashboardBackup.storeViewMode(ViewMode.VIEW);
          }
        : undefined;
      if (!hasUnsavedChanges) {
        switchModes?.();
        return;
      }
      confirmDiscardUnsavedChanges(() => {
        batch(async () => {
          setIsResetting(true);
          await dashboardApi.asyncResetToLastSavedState();
          if (isMounted()) {
            setIsResetting(false);
            switchModes?.();
          }
        });
      }, viewMode as ViewMode);
    },
    [dashboardApi, dashboardBackup, hasUnsavedChanges, viewMode, isMounted]
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
          dashboardBackup.storeViewMode(ViewMode.EDIT);
          dashboardApi.setViewMode(ViewMode.EDIT);
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
        disableButton: disableTopNav || !(hasRunMigrations || hasUnsavedChanges),
        run: () => quickSaveDashboard(),
      } as TopNavMenuData,

      interactiveSave: {
        disableButton: disableTopNav,
        emphasize: !Boolean(lastSavedId),
        id: 'interactive-save',
        testId: 'dashboardInteractiveSaveMenuItem',
        run: dashboardInteractiveSave,
        label:
          viewMode === ViewMode.VIEW
            ? topNavStrings.viewModeInteractiveSave.label
            : Boolean(lastSavedId)
            ? topNavStrings.editModeInteractiveSave.label
            : topNavStrings.quickSave.label,
        description:
          viewMode === ViewMode.VIEW
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
        run: () => dashboardApi.openSettingsFlyout(),
      },
    };
  }, [
    disableTopNav,
    isSaveInProgress,
    hasRunMigrations,
    hasUnsavedChanges,
    lastSavedId,
    dashboardInteractiveSave,
    viewMode,
    showShare,
    dashboardApi,
    setIsLabsShown,
    isLabsShown,
    dashboardBackup,
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
        (viewMode === ViewMode.EDIT && (isSaveInProgress || !lastSavedId)),
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
  const viewModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
    const duplicateMenuItem = showWriteControls ? [menuItems.interactiveSave] : [];
    const editMenuItem = showWriteControls && !managed ? [menuItems.edit] : [];
    const mayberesetChangesMenuItem = showResetChange ? [resetChangesMenuItem] : [];

    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...shareMenuItem,
      ...duplicateMenuItem,
      ...mayberesetChangesMenuItem,
      ...editMenuItem,
    ];
  }, [
    isLabsEnabled,
    menuItems,
    share,
    showWriteControls,
    managed,
    showResetChange,
    resetChangesMenuItem,
  ]);

  const editModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
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
  }, [isLabsEnabled, menuItems, share, lastSavedId, showResetChange, resetChangesMenuItem]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
