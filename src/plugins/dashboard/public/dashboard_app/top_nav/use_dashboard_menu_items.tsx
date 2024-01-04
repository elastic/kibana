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
  showResetChange,
}: {
  redirectTo: DashboardRedirect;
  isLabsShown: boolean;
  setIsLabsShown: Dispatch<SetStateAction<boolean>>;
  showResetChange?: boolean;
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  /**
   * Unpack dashboard services
   */
  const {
    share,
    dashboardBackup,
    settings: { uiSettings },
    dashboardCapabilities: { showWriteControls },
  } = pluginServices.getServices();
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);

  /**
   * Unpack dashboard state from redux
   */
  const dashboard = useDashboardAPI();

  const hasRunMigrations = dashboard.select(
    (state) => state.componentState.hasRunClientsideMigrations
  );
  const hasUnsavedChanges = dashboard.select((state) => state.componentState.hasUnsavedChanges);
  const hasOverlays = dashboard.select((state) => state.componentState.hasOverlays);
  const lastSavedId = dashboard.select((state) => state.componentState.lastSavedId);
  const dashboardTitle = dashboard.select((state) => state.explicitInput.title);
  const viewMode = dashboard.select((state) => state.explicitInput.viewMode);
  const managed = dashboard.select((state) => state.componentState.managed);
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
    setIsSaveInProgress(true);

    dashboard.runClone().then((result) => {
      setIsSaveInProgress(false);
      maybeRedirect(result);
    });
  }, [maybeRedirect, dashboard]);

  /**
   * Show the dashboard's "Confirm reset changes" modal. If confirmed:
   * (1) reset the dashboard to the last saved state, and
   * (2) if `switchToViewMode` is `true`, set the dashboard to view mode.
   */
  const resetChanges = useCallback(
    (switchToViewMode: boolean = false) => {
      dashboard.clearOverlays();
      const switchModes = switchToViewMode
        ? () => {
            dashboard.dispatch.setViewMode(ViewMode.VIEW);
            dashboardBackup.storeViewMode(ViewMode.VIEW);
          }
        : undefined;
      if (!hasUnsavedChanges) {
        switchModes?.();
        return;
      }
      confirmDiscardUnsavedChanges(() => {
        batch(() => {
          dashboard.resetToLastSavedState();
          switchModes?.();
        });
      }, viewMode);
    },
    [dashboard, dashboardBackup, hasUnsavedChanges, viewMode]
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
          dashboard.dispatch.setViewMode(ViewMode.EDIT);
          dashboard.clearOverlays();
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

      saveAs: {
        description: topNavStrings.saveAs.description,
        disableButton: disableTopNav,
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
        disableButton: disableTopNav || !lastSavedId,
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
        run: () => dashboard.showSettings(),
      } as TopNavMenuData,

      clone: {
        ...topNavStrings.clone,
        id: 'clone',
        testId: 'dashboardClone',
        disableButton: disableTopNav,
        run: () => clone(),
      } as TopNavMenuData,
    };
  }, [
    quickSaveDashboard,
    isSaveInProgress,
    hasRunMigrations,
    hasUnsavedChanges,
    dashboardBackup,
    saveDashboardAs,
    setIsLabsShown,
    disableTopNav,
    resetChanges,
    isLabsShown,
    lastSavedId,
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
    const editMenuItem = showWriteControls && !managed ? [menuItems.edit] : [];
    const mayberesetChangesMenuItem = showResetChange ? [resetChangesMenuItem] : [];

    return [
      ...labsMenuItem,
      menuItems.fullScreen,
      ...shareMenuItem,
      ...cloneMenuItem,
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
      editModeItems.push(menuItems.saveAs, menuItems.switchToViewMode);

      if (showResetChange) {
        editModeItems.push(resetChangesMenuItem);
      }

      editModeItems.push(menuItems.quickSave);
    } else {
      editModeItems.push(menuItems.switchToViewMode, menuItems.saveAs);
    }
    return [...labsMenuItem, menuItems.settings, ...shareMenuItem, ...editModeItems];
  }, [
    isLabsEnabled,
    menuItems.labs,
    menuItems.share,
    menuItems.settings,
    menuItems.saveAs,
    menuItems.switchToViewMode,
    menuItems.quickSave,
    share,
    lastSavedId,
    showResetChange,
    resetChangesMenuItem,
  ]);

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
