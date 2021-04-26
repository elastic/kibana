/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Required } from '@kbn/utility-types';
import UseUnmount from 'react-use/lib/useUnmount';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { saveDashboard } from '../lib';
import { TopNavIds } from './top_nav_ids';
import { PanelToolbar } from './panel_toolbar';
import { SavedQuery } from '../../services/data';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { ShowShareModal } from './show_share_modal';
import { getTopNavConfig } from './get_top_nav_config';
import { OverlayRef } from '../../../../../core/public';
import { useKibana } from '../../services/kibana_react';
import { showOptionsPopover } from './show_options_popover';
import { unsavedChangesBadge } from '../../dashboard_strings';
import { DashboardAppState, DashboardSaveOptions, NavAction } from '../../types';
import { DashboardAppServices, DashboardEmbedSettings, DashboardRedirect } from '../../types';
import { getSavedObjectFinder, SaveResult, showSaveModal } from '../../services/saved_objects';
import {
  setFullScreenMode,
  setHidePanelTitles,
  setSavedQueryId,
  setStateFromSaveModal,
  setSyncColors,
  setUseMargins,
  setViewMode,
  useDashboardDispatch,
  useDashboardSelector,
} from '../state';
import {
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../services/embeddable';
import { DashboardConstants } from '../../dashboard_constants';
import { confirmDiscardUnsavedChanges } from '../listing/confirm_overlays';
import { TopNavMenuProps } from '../../../../navigation/public';

export interface DashboardTopNavState {
  chromeIsVisible: boolean;
  addPanelOverlay?: OverlayRef;
  savedQuery?: SavedQuery;
  isSaveInProgress?: boolean;
}

type CompleteDashboardAppState = Required<
  DashboardAppState,
  | 'getLatestDashboardState'
  | 'dashboardContainer'
  | 'savedDashboard'
  | 'indexPatterns'
  | 'applyFilters'
>;

export const isCompleteDashboardAppState = (
  state: DashboardAppState
): state is CompleteDashboardAppState => {
  return (
    Boolean(state.getLatestDashboardState) &&
    Boolean(state.dashboardContainer) &&
    Boolean(state.savedDashboard) &&
    Boolean(state.indexPatterns) &&
    Boolean(state.applyFilters)
  );
};

export interface DashboardTopNavProps {
  onQuerySubmit: (_payload: unknown, isUpdate: boolean | undefined) => void;
  dashboardAppState: CompleteDashboardAppState;
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
}

export function DashboardTopNav({
  dashboardAppState,
  onQuerySubmit,
  embedSettings,
  redirectTo,
}: DashboardTopNavProps) {
  const {
    core,
    data,
    share,
    chrome,
    embeddable,
    navigation,
    uiSettings,
    initializerContext,
    savedObjectsTagging,
    setHeaderActionMenu,
    dashboardCapabilities,
    dashboardSessionStorage,
    allowByValueEmbeddables,
  } = useKibana<DashboardAppServices>().services;
  const { version: kibanaVersion } = initializerContext.env.packageInfo;
  const timefilter = data.query.timefilter.timefilter;
  const toasts = core.notifications.toasts;

  const dispatchDashboardStateChange = useDashboardDispatch();
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);

  const [mounted, setMounted] = useState(true);
  const [state, setState] = useState<DashboardTopNavState>({ chromeIsVisible: false });

  useEffect(() => {
    const visibleSubscription = chrome.getIsVisible$().subscribe((chromeIsVisible) => {
      setState((s) => ({ ...s, chromeIsVisible }));
    });
    const { id, title, getFullEditPath } = dashboardAppState.savedDashboard;
    if (id && title) {
      chrome.recentlyAccessed.add(
        getFullEditPath(dashboardState.viewMode === ViewMode.EDIT),
        title,
        id
      );
    }
    return () => {
      visibleSubscription.unsubscribe();
    };
  }, [chrome, allowByValueEmbeddables, dashboardState.viewMode, dashboardAppState.savedDashboard]);

  const addFromLibrary = useCallback(() => {
    if (!isErrorEmbeddable(dashboardAppState.dashboardContainer)) {
      setState((s) => ({
        ...s,
        addPanelOverlay: openAddPanelFlyout({
          embeddable: dashboardAppState.dashboardContainer,
          getAllFactories: embeddable.getEmbeddableFactories,
          getFactory: embeddable.getEmbeddableFactory,
          notifications: core.notifications,
          overlays: core.overlays,
          SavedObjectFinder: getSavedObjectFinder(core.savedObjects, uiSettings),
        }),
      }));
    }
  }, [
    dashboardAppState.dashboardContainer,
    embeddable.getEmbeddableFactories,
    embeddable.getEmbeddableFactory,
    core.notifications,
    core.savedObjects,
    core.overlays,
    uiSettings,
  ]);

  const createNew = useCallback(async () => {
    const type = 'visualization';
    const factory = embeddable.getEmbeddableFactory(type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    await factory.create({} as EmbeddableInput, dashboardAppState.dashboardContainer);
  }, [dashboardAppState.dashboardContainer, embeddable]);

  const clearAddPanel = useCallback(() => {
    if (state.addPanelOverlay) {
      state.addPanelOverlay.close();
      setState((s) => ({ ...s, addPanelOverlay: undefined }));
    }
  }, [state.addPanelOverlay]);

  const onChangeViewMode = useCallback(
    (newMode: ViewMode) => {
      clearAddPanel();
      const willLoseChanges = newMode === ViewMode.VIEW && dashboardAppState.hasUnsavedChanges;

      if (!willLoseChanges) {
        dispatchDashboardStateChange(setViewMode(newMode));
        return;
      }

      confirmDiscardUnsavedChanges(core.overlays, () =>
        dashboardAppState.resetToLastSavedState?.()
      );
    },
    [clearAddPanel, core.overlays, dashboardAppState, dispatchDashboardStateChange]
  );

  const runSaveAs = useCallback(async () => {
    const currentState = dashboardAppState.getLatestDashboardState();
    const onSave = async ({
      newTags,
      newTitle,
      newDescription,
      newCopyOnSave,
      newTimeRestore,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
    }: DashboardSaveOptions): Promise<SaveResult> => {
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };
      const stateFromSaveModal = {
        title: newTitle,
        description: newDescription,
        timeRestore: newTimeRestore,
        tags: [] as string[],
      };
      if (savedObjectsTagging && newTags) {
        stateFromSaveModal.tags = newTags;
      }

      dashboardAppState.savedDashboard.copyOnSave = newCopyOnSave;
      const saveResult = await saveDashboard({
        toasts,
        timefilter,
        redirectTo,
        saveOptions,
        savedObjectsTagging,
        version: kibanaVersion,
        dashboardSessionStorage,
        savedDashboard: dashboardAppState.savedDashboard,
        currentState: { ...currentState, ...stateFromSaveModal },
      });
      if (saveResult.id && !saveResult.redirected) {
        dispatchDashboardStateChange(setStateFromSaveModal(stateFromSaveModal));
        dashboardAppState.updateLastSavedState?.();
      }
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };

    const lastDashboardId = dashboardAppState.savedDashboard.id;
    const currentTags = savedObjectsTagging?.ui.hasTagDecoration(dashboardAppState.savedDashboard)
      ? dashboardAppState.savedDashboard.getTags()
      : [];
    const dashboardSaveModal = (
      <DashboardSaveModal
        onSave={onSave}
        onClose={() => {}}
        tags={currentTags}
        title={currentState.title}
        timeRestore={currentState.timeRestore}
        description={currentState.description}
        savedObjectsTagging={savedObjectsTagging}
        showCopyOnSave={lastDashboardId ? true : false}
      />
    );
    clearAddPanel();
    showSaveModal(dashboardSaveModal, core.i18n.Context);
  }, [
    dispatchDashboardStateChange,
    dashboardSessionStorage,
    savedObjectsTagging,
    dashboardAppState,
    core.i18n.Context,
    clearAddPanel,
    kibanaVersion,
    timefilter,
    redirectTo,
    toasts,
  ]);

  const runQuickSave = useCallback(async () => {
    setState((s) => ({ ...s, isSaveInProgress: true }));
    const currentState = dashboardAppState.getLatestDashboardState();
    const saveResult = await saveDashboard({
      toasts,
      timefilter,
      redirectTo,
      currentState,
      saveOptions: {},
      savedObjectsTagging,
      version: kibanaVersion,
      dashboardSessionStorage,
      savedDashboard: dashboardAppState.savedDashboard,
    });
    if (saveResult.id && !saveResult.redirected) {
      dashboardAppState.updateLastSavedState?.();
    }
    // turn off save in progress after the next change check. This prevents the save button from flashing
    setTimeout(() => {
      if (!mounted) return;
      setState((s) => ({ ...s, isSaveInProgress: false }));
    }, DashboardConstants.CHANGE_CHECK_DEBOUNCE);
  }, [
    dashboardSessionStorage,
    savedObjectsTagging,
    dashboardAppState,
    kibanaVersion,
    timefilter,
    redirectTo,
    mounted,
    toasts,
  ]);

  const runClone = useCallback(() => {
    const currentState = dashboardAppState.getLatestDashboardState();
    const onClone = async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      dashboardAppState.savedDashboard.copyOnSave = true;
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };
      const saveResult = await saveDashboard({
        toasts,
        timefilter,
        redirectTo,
        saveOptions,
        savedObjectsTagging,
        version: kibanaVersion,
        dashboardSessionStorage,
        savedDashboard: dashboardAppState.savedDashboard,
        currentState: { ...currentState, title: newTitle },
      });
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };
    showCloneModal(onClone, currentState.title);
  }, [
    dashboardSessionStorage,
    savedObjectsTagging,
    dashboardAppState,
    kibanaVersion,
    redirectTo,
    timefilter,
    toasts,
  ]);

  const showOptions = useCallback(
    (anchorElement: HTMLElement) => {
      const currentState = dashboardAppState.getLatestDashboardState();
      showOptionsPopover({
        anchorElement,
        useMargins: currentState.options.useMargins,
        onUseMarginsChange: (isChecked: boolean) => {
          dispatchDashboardStateChange(setUseMargins(isChecked));
        },
        syncColors: Boolean(currentState.options.syncColors),
        onSyncColorsChange: (isChecked: boolean) => {
          dispatchDashboardStateChange(setSyncColors(isChecked));
        },
        hidePanelTitles: currentState.options.hidePanelTitles,
        onHidePanelTitlesChange: (isChecked: boolean) => {
          dispatchDashboardStateChange(setHidePanelTitles(isChecked));
        },
      });
    },
    [dashboardAppState, dispatchDashboardStateChange]
  );

  const showShare = useCallback(
    (anchorElement: HTMLElement) => {
      if (!share) return;
      const currentState = dashboardAppState.getLatestDashboardState();
      ShowShareModal({
        share,
        kibanaVersion,
        anchorElement,
        dashboardCapabilities,
        currentDashboardState: currentState,
        savedDashboard: dashboardAppState.savedDashboard,
      });
    },
    [dashboardAppState, dashboardCapabilities, share, kibanaVersion]
  );

  const dashboardTopNavActions = useMemo(() => {
    const actions = {
      [TopNavIds.FULL_SCREEN]: () => dispatchDashboardStateChange(setFullScreenMode(true)),
      [TopNavIds.EXIT_EDIT_MODE]: () => onChangeViewMode(ViewMode.VIEW),
      [TopNavIds.ENTER_EDIT_MODE]: () => onChangeViewMode(ViewMode.EDIT),
      [TopNavIds.QUICK_SAVE]: runQuickSave,
      [TopNavIds.OPTIONS]: showOptions,
      [TopNavIds.SAVE]: runSaveAs,
      [TopNavIds.CLONE]: runClone,
    } as { [key: string]: NavAction };

    if (share) {
      actions[TopNavIds.SHARE] = showShare;
    }
    return actions;
  }, [
    dispatchDashboardStateChange,
    onChangeViewMode,
    runQuickSave,
    showOptions,
    runSaveAs,
    showShare,
    runClone,
    share,
  ]);

  UseUnmount(() => {
    clearAddPanel();
    setMounted(false);
  });

  const getNavBarProps = (): TopNavMenuProps => {
    const { hasUnsavedChanges, savedDashboard } = dashboardAppState;
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || state.chromeIsVisible) && !dashboardState.fullScreenMode;

    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide &&
      (data.query.filterManager.getFilters().length > 0 || !dashboardState.fullScreenMode);

    const isFullScreenMode = dashboardState.fullScreenMode;
    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowQueryInput));
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showQueryBar = showQueryInput || showDatePicker;
    const showSearchBar = showQueryBar || showFilterBar;
    const screenTitle = dashboardState.title;

    const topNav = getTopNavConfig(
      dashboardAppState.getLatestDashboardState().viewMode,
      dashboardTopNavActions,
      {
        hideWriteControls: dashboardCapabilities.hideWriteControls,
        isNewDashboard: !savedDashboard.id,
        isSaveInProgress: state.isSaveInProgress,
        isDirty: Boolean(dashboardAppState.hasUnsavedChanges),
      }
    );

    const badges =
      hasUnsavedChanges && dashboardState.viewMode === ViewMode.EDIT
        ? [
            {
              'data-test-subj': 'dashboardUnsavedChangesBadge',
              badgeText: unsavedChangesBadge.getUnsavedChangedBadgeText(),
              color: 'secondary',
            },
          ]
        : undefined;

    return {
      badges,
      appName: 'dashboard',
      config: showTopNavMenu ? topNav : undefined,
      className: isFullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined,
      screenTitle,
      showSearchBar,
      showQueryBar,
      showQueryInput,
      showDatePicker,
      showFilterBar,
      setMenuMountPoint: embedSettings ? undefined : setHeaderActionMenu,
      indexPatterns: dashboardAppState.indexPatterns,
      showSaveQuery: dashboardCapabilities.saveQuery,
      useDefaultBehaviors: true,
      onQuerySubmit,
      onSavedQueryUpdated: (savedQuery: SavedQuery) => {
        // TODO: Figure out why this isn't run -- even in master
        const allFilters = data.query.filterManager.getFilters();
        data.query.filterManager.setFilters(allFilters);
        dashboardAppState.applyFilters(savedQuery.attributes.query, allFilters);
        if (savedQuery.attributes.timefilter) {
          timefilter.setTime({
            from: savedQuery.attributes.timefilter.from,
            to: savedQuery.attributes.timefilter.to,
          });
          if (savedQuery.attributes.timefilter.refreshInterval) {
            timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
          }
        }
        setState((s) => ({ ...s, savedQuery }));
      },
      savedQuery: state.savedQuery,
      savedQueryId: dashboardState.savedQuery,
      onSavedQueryIdChange: (newId: string | undefined) =>
        dispatchDashboardStateChange(setSavedQueryId(newId)),
    };
  };

  const { TopNavMenu } = navigation.ui;
  return (
    <>
      <TopNavMenu {...getNavBarProps()} />
      {dashboardAppState.getLatestDashboardState().viewMode !== ViewMode.VIEW ? (
        <PanelToolbar onAddPanelClick={createNew} onLibraryClick={addFromLibrary} />
      ) : null}
    </>
  );
}
