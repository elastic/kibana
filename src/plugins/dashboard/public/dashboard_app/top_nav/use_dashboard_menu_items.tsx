/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';

import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';

import { UI_SETTINGS } from '../../../common';
import { useDashboardContainerContext } from '../../dashboard_container/dashboard_container_renderer';
import { pluginServices } from '../../services/plugin_services';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { DashboardRedirect } from '../types';
import { SaveDashboardReturn } from '../../services/dashboard_saved_object/types';

export const useDashboardMenuItems = ({ redirectTo }: { redirectTo: DashboardRedirect }) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [isLabsShown, setIsLabsShown] = useState(false);

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
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    embeddableInstance: dashboardContainer,
    actions: { setViewMode, setFullScreenMode },
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const hasUnsavedChanges = select((state) => state.componentState.hasUnsavedChanges);
  const lastSavedId = select((state) => state.componentState.lastSavedId);

  /**
   * Show the Dashboard app's share menu
   */
  const showShare = useCallback(
    (anchorElement: HTMLElement) => {
      const dashboardState = dashboardContainer.getReduxEmbeddableTools().getState();
      ShowShareModal({
        anchorElement,
        currentDashboardState: dashboardState.explicitInput,
        isDirty: Boolean(dashboardState.componentState.hasUnsavedChanges),
      });
    },
    [dashboardContainer]
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
    dashboardContainer.runQuickSave().then(() => setIsSaveInProgress(false));
  }, [dashboardContainer]);

  /**
   * Show the dashboard's save modal
   */
  const saveDashboardAs = useCallback(() => {
    dashboardContainer.runSaveAs().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboardContainer]);

  /**
   * Clone the dashboard
   */
  const clone = useCallback(() => {
    dashboardContainer.runClone().then((result) => maybeRedirect(result));
  }, [maybeRedirect, dashboardContainer]);

  /**
   * Register all of the top nav configs that can be used by dashboard.
   */
  const menuItems = useMemo(() => {
    return {
      fullScreen: {
        ...topNavStrings.fullScreen,
        id: 'full-screen',
        testId: 'dashboardFullScreenMode',
        run: () => dispatch(setFullScreenMode(true)),
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
        run: () => dispatch(setViewMode(ViewMode.EDIT)),
      } as TopNavMenuData,

      quickSave: {
        ...topNavStrings.quickSave,
        id: 'quick-save',
        iconType: 'save',
        emphasize: true,
        isLoading: isSaveInProgress,
        testId: 'dashboardQuickSaveMenuItem',
        disableButton: !hasUnsavedChanges || isSaveInProgress,
        run: () => quickSaveDashboard(),
      } as TopNavMenuData,

      saveAs: {
        description: topNavStrings.saveAs.description,
        disableButton: isSaveInProgress,
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
        disableButton: isSaveInProgress || !lastSavedId,
        testId: 'dashboardViewOnlyMode',
        run: () => dispatch(setViewMode(ViewMode.VIEW)),
      } as TopNavMenuData,

      share: {
        ...topNavStrings.share,
        id: 'share',
        testId: 'shareTopNavButton',
        disableButton: isSaveInProgress,
        run: showShare,
      } as TopNavMenuData,

      options: {
        ...topNavStrings.options,
        id: 'options',
        testId: 'dashboardOptionsButton',
        disableButton: isSaveInProgress,
        run: (anchor) => dashboardContainer.showOptions(anchor),
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
    dashboardContainer,
    hasUnsavedChanges,
    setFullScreenMode,
    isSaveInProgress,
    saveDashboardAs,
    isLabsShown,
    lastSavedId,
    setViewMode,
    showShare,
    dispatch,
    clone,
  ]);

  /**
   * Build ordered menus for view and edit mode.
   */
  const viewModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
    const writePermissionsMenuItems = showWriteControls ? [menuItems.clone, menuItems.edit] : [];
    return [...labsMenuItem, menuItems.fullScreen, ...shareMenuItem, ...writePermissionsMenuItems];
  }, [menuItems, share, showWriteControls, isLabsEnabled]);

  const editModeTopNavConfig = useMemo(() => {
    const labsMenuItem = isLabsEnabled ? [menuItems.labs] : [];
    const shareMenuItem = share ? [menuItems.share] : [];
    const editModeItems: TopNavMenuData[] = [];
    if (lastSavedId) {
      editModeItems.push(menuItems.saveAs, menuItems.switchToViewMode, menuItems.quickSave);
    } else {
      editModeItems.push(menuItems.switchToViewMode, menuItems.saveAs);
    }
    return [...labsMenuItem, menuItems.options, ...shareMenuItem, ...editModeItems];
  }, [lastSavedId, menuItems, share, isLabsEnabled]);

  return { viewModeTopNavConfig, editModeTopNavConfig, isLabsShown, setIsLabsShown };
};
