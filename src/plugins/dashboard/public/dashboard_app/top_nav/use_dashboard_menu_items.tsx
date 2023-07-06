/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { batch } from 'react-redux';
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';

import { UI_SETTINGS } from '../../../common';
import { useDashboardAPI } from '../dashboard_app';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { pluginServices } from '../../services/plugin_services';
import { CHANGE_CHECK_DEBOUNCE } from '../../dashboard_constants';
import { DashboardRedirect } from '../../dashboard_container/types';
import { SaveDashboardReturn } from '../../services/dashboard_content_management/types';
import { confirmDiscardUnsavedChanges } from '../../dashboard_listing/confirm_overlays';

export const useDashboardMenuItems = ({
  redirectTo,
  isLabsShown,
  setIsLabsShown,
}: {
  redirectTo: DashboardRedirect;
  isLabsShown: boolean;
  setIsLabsShown: Dispatch<SetStateAction<boolean>>;
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  /**
   * Unpack dashboard services
   */
  const {
    share,
    settings: { uiSettings },
    dashboardCapabilities: { showWriteControls },
  } = pluginServices.getServices();
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);

  /**
   * Unpack dashboard state from redux
   */
  const dashboard = useDashboardAPI();

  const hasUnsavedChanges = dashboard.select((state) => state.componentState.hasUnsavedChanges);
  const hasOverlays = dashboard.select((state) => state.componentState.hasOverlays);
  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);
  const dashboardTitle = dashboard.select((state) => state.explicitInput.title);
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);

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
      });
    },
    [dashboardTitle, hasUnsavedChanges, lastSavedId]
  );

  const maybeRedirect = useCallback(
    (result?: SaveDashboardReturn) => {
      if (!result) return;
      const { redirectRequired, id } = result;
      if (redirectRequired) {
        redirectTo({
          id,
          editMode: true,
          useReplace: true,
          destination: 'dashboard',
        });
      }
    },
    [redirectTo]
  );

  /**
   * Save the dashboard without any UI or popups.
   */
  const quickSaveDashboard = useCallback(() => {
    setIsSaveInProgress(true);
    dashboard
      .runQuickSave()
      .then(() => setTimeout(() => setIsSaveInProgress(false), CHANGE_CHECK_DEBOUNCE));
  }, [dashboard]);

  /**
   * Show the dashboard's save modal
   */
  const saveDashboardAs = useCallback(() => {
    dashboard.runSaveAs().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboard]);

  /**
   * Clone the dashboard
   */
  const clone = useCallback(() => {
    dashboard.runClone().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboard]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const resetChanges = useCallback(
    (switchToViewMode: boolean = false) => {
      dashboard.clearOverlays();
      if (hasUnsavedChanges) {
        confirmDiscardUnsavedChanges(() => {
          batch(() => {
            dashboard.resetToLastSavedState();
            if (switchToViewMode) dashboard.dispatch.setViewMode(ViewMode.VIEW);
          });
        }, viewMode);
      } else {
        if (switchToViewMode) dashboard.dispatch.setViewMode(ViewMode.VIEW);
      }
    },
    [dashboard, hasUnsavedChanges, viewMode]
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
        run: () => dashboard.dispatch.setFullScreenMode(true),
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
          dashboard.dispatch.setViewMode(ViewMode.EDIT);
          dashboard.clearOverlays();
        },
      } as TopNavMenuData,

      quickSave: {
        ...topNavStrings.quickSave,
        id: 'quick-save',
        iconType: 'save',
        emphasize: true,
        isLoading: isSaveInProgress,
        testId: 'dashboardQuickSaveMenuItem',
        disableButton: !hasUnsavedChanges || isSaveInProgress || hasOverlays,
        run: () => quickSaveDashboard(),
      } as TopNavMenuData,

      saveAs: {
        description: topNavStrings.saveAs.description,
        disableButton: isSaveInProgress || hasOverlays,
        id: 'save',
        emphasize: !Boolean(lastSavedId),
        testId: 'dashboardSaveMenuItem',
        iconType: Boolean(lastSavedId) ? undefined : 'save',
        label: Boolean(lastSavedId) ? topNavStrings.saveAs.label : topNavStrings.quickSave.label,
        run: () => saveDashboardAs(),
      } as TopNavMenuData,

      switchToViewMode: {
        ...topNavStrings.switchToViewMode,
        id: 'cancel',
        disableButton: isSaveInProgress || !lastSavedId || hasOverlays,
        testId: 'dashboardViewOnlyMode',
        run: () => resetChanges(true),
      } as TopNavMenuData,

      share: {
        ...topNavStrings.share,
        id: 'share',
        testId: 'shareTopNavButton',
        disableButton: isSaveInProgress || hasOverlays,
        run: showShare,
      } as TopNavMenuData,

      settings: {
        ...topNavStrings.settings,
        id: 'settings',
        testId: 'dashboardSettingsButton',
        disableButton: isSaveInProgress || hasOverlays,
        run: () => dashboard.showSettings(),
      } as TopNavMenuData,

      clone: {
        ...topNavStrings.clone,
        id: 'clone',
        testId: 'dashboardClone',
        disableButton: isSaveInProgress,
        run: () => clone(),
      } as TopNavMenuData,
    };
  }, [
    quickSaveDashboard,
    hasUnsavedChanges,
    isSaveInProgress,
    saveDashboardAs,
    setIsLabsShown,
    resetChanges,
    hasOverlays,
    lastSavedId,
    isLabsShown,
    showShare,
    dashboard,
    clone,
  ]);

  const resetChangesMenuItem = useMemo(() => {
    return {
      ...topNavStrings.resetChanges,
      id: 'reset',
      testId: 'dashboardDiscardChangesMenuItem',
      disableButton:
        !hasUnsavedChanges ||
        hasOverlays ||
        (viewMode === ViewMode.EDIT && (isSaveInProgress || !lastSavedId)),
      run: () => resetChanges(),
    };
  }, [hasOverlays, lastSavedId, resetChanges, viewMode, isSaveInProgress, hasUnsavedChanges]);

  /**
   * Build ordered menus for view and edit mode.
   */
  const viewModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
    const cloneMenuItem = showWriteControls ? [menuItems.clone] : [];
    const editMenuItem = showWriteControls ? [menuItems.edit] : [];
    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...shareMenuItem,
      ...cloneMenuItem,
      resetChangesMenuItem,
      ...editMenuItem,
    ];
  }, [menuItems, share, showWriteControls, resetChangesMenuItem, isLabsEnabled]);

  const editModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
    const editModeItems: TopNavMenuData[] = [];
    if (lastSavedId) {
      editModeItems.push(
        menuItems.saveAs,
        menuItems.switchToViewMode,
        resetChangesMenuItem,
        menuItems.quickSave
      );
    } else {
      editModeItems.push(menuItems.switchToViewMode, menuItems.saveAs);
    }
    return [...labsMenuItem, menuItems.settings, ...shareMenuItem, ...editModeItems];
  }, [lastSavedId, menuItems, share, resetChangesMenuItem, isLabsEnabled]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
