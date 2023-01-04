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

import { DashboardRedirect } from '../types';
import { UI_SETTINGS } from '../../../common';
import { topNavStrings } from '../_dashboard_app_strings';
import { ShowShareModal } from './share/show_share_modal';
import { pluginServices } from '../../services/plugin_services';
import { CHANGE_CHECK_DEBOUNCE } from '../../dashboard_constants';
import { SaveDashboardReturn } from '../../services/dashboard_saved_object/types';
import { useDashboardContainerContext } from '../../dashboard_container/dashboard_container_renderer';
import { confirmDiscardUnsavedChanges } from '../listing/confirm_overlays';

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
  const {
    useEmbeddableDispatch,
    useEmbeddableSelector: select,
    embeddableInstance: dashboardContainer,
    actions: { setViewMode, setFullScreenMode },
  } = useDashboardContainerContext();
  const dispatch = useEmbeddableDispatch();

  const hasUnsavedChanges = select((state) => state.componentState.hasUnsavedChanges);
  const lastSavedId = select((state) => state.componentState.lastSavedId);
  const dashboardTitle = select((state) => state.explicitInput.title);

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
    dashboardContainer
      .runQuickSave()
      .then(() => setTimeout(() => setIsSaveInProgress(false), CHANGE_CHECK_DEBOUNCE));
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
   * Returns to view mode. If the dashboard has unsaved changes shows a warning and resets to last saved state.
   */
  const returnToViewMode = useCallback(() => {
    dashboardContainer.clearOverlays();
    if (hasUnsavedChanges) {
      confirmDiscardUnsavedChanges(() => {
        batch(() => {
          dashboardContainer.resetToLastSavedState();
          dispatch(setViewMode(ViewMode.VIEW));
        });
      });
      return;
    }
    dispatch(setViewMode(ViewMode.VIEW));
  }, [dashboardContainer, dispatch, hasUnsavedChanges, setViewMode]);

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
        run: () => returnToViewMode(),
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
    returnToViewMode,
    saveDashboardAs,
    setIsLabsShown,
    lastSavedId,
    setViewMode,
    isLabsShown,
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

  return { viewModeTopNavConfig, editModeTopNavConfig };
};
