/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { Required } from '@kbn/utility-types';
import { EuiHorizontalRule } from '@elastic/eui';
import UseUnmount from 'react-use/lib/useUnmount';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { OverlayRef } from '@kbn/core/public';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import {
  AddFromLibraryButton,
  LazyLabsFlyout,
  PrimaryActionButton,
  QuickButtonGroup,
  QuickButtonProps,
  SolutionToolbar,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import type { SavedQuery } from '@kbn/data-plugin/common';
import { isErrorEmbeddable, openAddPanelFlyout, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  getSavedObjectFinder,
  type SaveResult,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';

import { saveDashboard } from '../lib';
import { TopNavIds } from './top_nav_ids';
import { EditorMenu } from './editor_menu';
import { UI_SETTINGS } from '../../../common';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { ShowShareModal } from './show_share_modal';
import { getTopNavConfig } from './get_top_nav_config';
import { showOptionsPopover } from './show_options_popover';
import { DashboardConstants } from '../../dashboard_constants';
import { confirmDiscardUnsavedChanges } from '../listing/confirm_overlays';
import type { DashboardAppState, DashboardSaveOptions, NavAction } from '../../types';
import type { DashboardEmbedSettings, DashboardRedirect } from '../../types';
import { getCreateVisualizationButtonTitle, unsavedChangesBadge } from '../../dashboard_strings';
import {
  setFullScreenMode,
  setHidePanelTitles,
  setSavedQueryId,
  setStateFromSaveModal,
  setSyncColors,
  setSyncTooltips,
  setUseMargins,
  setViewMode,
  useDashboardDispatch,
  useDashboardSelector,
} from '../state';
import { pluginServices } from '../../services/plugin_services';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';

export interface DashboardTopNavState {
  chromeIsVisible: boolean;
  addPanelOverlay?: OverlayRef;
  savedQuery?: SavedQuery;
  isSaveInProgress?: boolean;
}

type CompleteDashboardAppState = Required<
  DashboardAppState,
  'getLatestDashboardState' | 'dashboardContainer' | 'savedDashboard' | 'applyFilters'
>;

export const isCompleteDashboardAppState = (
  state: DashboardAppState
): state is CompleteDashboardAppState => {
  return (
    Boolean(state.getLatestDashboardState) &&
    Boolean(state.dashboardContainer) &&
    Boolean(state.savedDashboard) &&
    Boolean(state.applyFilters)
  );
};

export interface DashboardTopNavProps {
  dashboardAppState: CompleteDashboardAppState;
  embedSettings?: DashboardEmbedSettings;
  redirectTo: DashboardRedirect;
  printMode: boolean;
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function DashboardTopNav({
  dashboardAppState,
  embedSettings,
  redirectTo,
  printMode,
}: DashboardTopNavProps) {
  const { setHeaderActionMenu } = useDashboardMountContext();
  const {
    chrome: {
      getIsVisible$: getChromeIsVisible$,
      recentlyAccessed: chromeRecentlyAccessed,
      docTitle,
    },
    coreContext: { i18nContext },
    dashboardCapabilities,
    data: { query, search },
    embeddable: { getEmbeddableFactory, getEmbeddableFactories, getStateTransfer },
    initializerContext: { allowByValueEmbeddables },
    navigation: { TopNavMenu },
    notifications,
    overlays,
    savedObjects,
    savedObjectsTagging: { hasTagDecoration, hasApi },
    settings: { uiSettings, theme },
    share,
    usageCollection,
    visualizations: { get: getVisualization, getAliases: getVisTypeAliases },
  } = pluginServices.getServices();

  const dispatchDashboardStateChange = useDashboardDispatch();
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);

  const [mounted, setMounted] = useState(true);
  const [state, setState] = useState<DashboardTopNavState>({ chromeIsVisible: false });
  const [isLabsShown, setIsLabsShown] = useState(false);

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes = ['markdown', 'maps'];
  const stateTransferService = getStateTransfer();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);

  const trackUiMetric = usageCollection.reportUiCounter?.bind(
    usageCollection,
    DashboardConstants.DASHBOARD_ID
  );

  useEffect(() => {
    const visibleSubscription = getChromeIsVisible$().subscribe((chromeIsVisible) => {
      setState((s) => ({ ...s, chromeIsVisible }));
    });
    const { id, title, getFullEditPath } = dashboardAppState.savedDashboard;
    if (id && title) {
      chromeRecentlyAccessed.add(
        getFullEditPath(dashboardState.viewMode === ViewMode.EDIT),
        title,
        id
      );
    }
    return () => {
      visibleSubscription.unsubscribe();
    };
  }, [
    getChromeIsVisible$,
    chromeRecentlyAccessed,
    allowByValueEmbeddables,
    dashboardState.viewMode,
    dashboardAppState.savedDashboard,
  ]);

  const addFromLibrary = useCallback(() => {
    if (!isErrorEmbeddable(dashboardAppState.dashboardContainer)) {
      setState((s) => ({
        ...s,
        addPanelOverlay: openAddPanelFlyout({
          embeddable: dashboardAppState.dashboardContainer,
          getAllFactories: getEmbeddableFactories,
          getFactory: getEmbeddableFactory,
          notifications,
          overlays,
          SavedObjectFinder: getSavedObjectFinder(savedObjects, uiSettings),
          reportUiCounter: usageCollection.reportUiCounter,
          theme,
        }),
      }));
    }
  }, [
    dashboardAppState.dashboardContainer,
    getEmbeddableFactories,
    getEmbeddableFactory,
    notifications,
    savedObjects,
    overlays,
    theme,
    uiSettings,
    usageCollection,
  ]);

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackUiMetric) {
          trackUiMetric(METRIC_TYPE.CLICK, `${visType.name}:create`);
        }

        if ('aliasPath' in visType) {
          appId = visType.aliasApp;
          path = visType.aliasPath;
        } else {
          appId = 'visualize';
          path = `#/create?type=${encodeURIComponent(visType.name)}`;
        }
      } else {
        appId = 'visualize';
        path = '#/create?';
      }

      stateTransferService.navigateToEditor(appId, {
        path,
        state: {
          originatingApp: DashboardConstants.DASHBOARDS_ID,
          searchSessionId: search.session.getSessionId(),
        },
      });
    },
    [stateTransferService, search.session, trackUiMetric]
  );

  const closeAllFlyouts = useCallback(() => {
    dashboardAppState.dashboardContainer.controlGroup?.closeAllFlyouts();
    if (state.addPanelOverlay) {
      state.addPanelOverlay.close();
      setState((s) => ({ ...s, addPanelOverlay: undefined }));
    }
  }, [state.addPanelOverlay, dashboardAppState.dashboardContainer.controlGroup]);

  const onChangeViewMode = useCallback(
    (newMode: ViewMode) => {
      closeAllFlyouts();
      const willLoseChanges = newMode === ViewMode.VIEW && dashboardAppState.hasUnsavedChanges;

      if (!willLoseChanges) {
        dispatchDashboardStateChange(setViewMode(newMode));
        return;
      }

      confirmDiscardUnsavedChanges(() => dashboardAppState.resetToLastSavedState?.());
    },
    [closeAllFlyouts, dashboardAppState, dispatchDashboardStateChange]
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
      if (hasApi && newTags) {
        // remove `hasAPI` once the savedObjectsTagging service is optional
        stateFromSaveModal.tags = newTags;
      }

      dashboardAppState.savedDashboard.copyOnSave = newCopyOnSave;
      const saveResult = await saveDashboard({
        redirectTo,
        saveOptions,
        savedDashboard: dashboardAppState.savedDashboard,
        currentState: { ...currentState, ...stateFromSaveModal },
      });
      if (saveResult.id && !saveResult.redirected) {
        dispatchDashboardStateChange(setStateFromSaveModal(stateFromSaveModal));
        dashboardAppState.updateLastSavedState?.();
        docTitle.change(stateFromSaveModal.title);
      }
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };

    const lastDashboardId = dashboardAppState.savedDashboard.id;
    const savedTags = hasTagDecoration?.(dashboardAppState.savedDashboard)
      ? dashboardAppState.savedDashboard.getTags()
      : [];
    const currentTagsSet = new Set([...savedTags, ...currentState.tags]);

    const dashboardSaveModal = (
      <DashboardSaveModal
        onSave={onSave}
        onClose={() => {}}
        tags={Array.from(currentTagsSet)}
        title={currentState.title}
        timeRestore={currentState.timeRestore}
        description={currentState.description}
        showCopyOnSave={lastDashboardId ? true : false}
      />
    );
    closeAllFlyouts();
    showSaveModal(dashboardSaveModal, i18nContext);
  }, [
    dispatchDashboardStateChange,
    hasApi,
    hasTagDecoration,
    dashboardAppState,
    i18nContext,
    docTitle,
    closeAllFlyouts,
    redirectTo,
  ]);

  const runQuickSave = useCallback(async () => {
    setState((s) => ({ ...s, isSaveInProgress: true }));
    const currentState = dashboardAppState.getLatestDashboardState();
    const saveResult = await saveDashboard({
      redirectTo,
      currentState,
      saveOptions: {},
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
  }, [dashboardAppState, redirectTo, mounted]);

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
        redirectTo,
        saveOptions,
        savedDashboard: dashboardAppState.savedDashboard,
        currentState: { ...currentState, title: newTitle },
      });
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };
    showCloneModal({ onClone, title: currentState.title });
  }, [dashboardAppState, redirectTo]);

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
        syncTooltips: Boolean(currentState.options.syncTooltips),
        onSyncTooltipsChange: (isChecked: boolean) => {
          dispatchDashboardStateChange(setSyncTooltips(isChecked));
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
      const currentState = dashboardAppState.getLatestDashboardState();
      ShowShareModal({
        anchorElement,
        currentDashboardState: currentState,
        savedDashboard: dashboardAppState.savedDashboard,
        isDirty: Boolean(dashboardAppState.hasUnsavedChanges),
      });
    },
    [dashboardAppState]
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

    if (share !== {}) {
      // TODO: Clean up this logic once share is optional
      actions[TopNavIds.SHARE] = showShare;
    }

    if (isLabsEnabled) {
      actions[TopNavIds.LABS] = () => {
        setIsLabsShown(!isLabsShown);
      };
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
    isLabsEnabled,
    isLabsShown,
  ]);

  UseUnmount(() => {
    closeAllFlyouts();
    setMounted(false);
  });

  const getNavBarProps = (): TopNavMenuProps => {
    const { hasUnsavedChanges, savedDashboard } = dashboardAppState;
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || state.chromeIsVisible) && !dashboardState.fullScreenMode;

    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide && (query.filterManager.getFilters().length > 0 || !dashboardState.fullScreenMode);

    const isFullScreenMode = dashboardState.fullScreenMode;
    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(
      Boolean(embedSettings?.forceShowQueryInput || printMode)
    );
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showQueryBar = showQueryInput || showDatePicker || showFilterBar;
    const showSearchBar = showQueryBar || showFilterBar;
    const screenTitle = dashboardState.title;

    const topNav = getTopNavConfig(
      dashboardAppState.getLatestDashboardState().viewMode,
      dashboardTopNavActions,
      {
        showWriteControls: dashboardCapabilities.showWriteControls,
        isDirty: Boolean(dashboardAppState.hasUnsavedChanges),
        isSaveInProgress: state.isSaveInProgress,
        isNewDashboard: !savedDashboard.id,
        isLabsEnabled,
      }
    );

    const badges =
      hasUnsavedChanges && dashboardState.viewMode === ViewMode.EDIT
        ? [
            {
              'data-test-subj': 'dashboardUnsavedChangesBadge',
              badgeText: unsavedChangesBadge.getUnsavedChangedBadgeText(),
              color: 'success',
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
      indexPatterns: dashboardAppState.dataViews,
      showSaveQuery: dashboardCapabilities.saveQuery,
      useDefaultBehaviors: true,
      savedQuery: state.savedQuery,
      savedQueryId: dashboardState.savedQuery,
      visible: printMode !== true,
      onQuerySubmit: (_payload, isUpdate) => {
        if (isUpdate === false) {
          dashboardAppState.$triggerDashboardRefresh.next({ force: true });
        }
      },
      onSavedQueryIdChange: (newId: string | undefined) => {
        dispatchDashboardStateChange(setSavedQueryId(newId));
      },
    };
  };

  const getVisTypeQuickButton = (visTypeName: string) => {
    const visType =
      getVisualization(visTypeName) || getVisTypeAliases().find(({ name }) => name === visTypeName);

    if (visType) {
      if ('aliasPath' in visType) {
        const { name, icon, title } = visType as VisTypeAlias;

        return {
          iconType: icon,
          createType: title,
          onClick: createNewVisType(visType as VisTypeAlias),
          'data-test-subj': `dashboardQuickButton${name}`,
        };
      } else {
        const { name, icon, title, titleInWizard } = visType as BaseVisType;

        return {
          iconType: icon,
          createType: titleInWizard || title,
          onClick: createNewVisType(visType as BaseVisType),
          'data-test-subj': `dashboardQuickButton${name}`,
        };
      }
    }

    return;
  };

  const quickButtons = quickButtonVisTypes
    .map(getVisTypeQuickButton)
    .filter((button) => button) as QuickButtonProps[];

  return (
    <>
      <TopNavMenu {...getNavBarProps()} />
      {!printMode && isLabsEnabled && isLabsShown ? (
        <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
      ) : null}
      {dashboardState.viewMode !== ViewMode.VIEW && !printMode ? (
        <>
          <EuiHorizontalRule margin="none" />
          <SolutionToolbar isDarkModeEnabled={IS_DARK_THEME}>
            {{
              primaryActionButton: (
                <PrimaryActionButton
                  isDarkModeEnabled={IS_DARK_THEME}
                  label={getCreateVisualizationButtonTitle()}
                  onClick={createNewVisType(lensAlias)}
                  iconType="lensApp"
                  data-test-subj="dashboardAddNewPanelButton"
                />
              ),
              quickButtonGroup: <QuickButtonGroup buttons={quickButtons} />,
              extraButtons: [
                <EditorMenu
                  createNewVisType={createNewVisType}
                  dashboardContainer={dashboardAppState.dashboardContainer}
                />,
                <AddFromLibraryButton
                  onClick={addFromLibrary}
                  data-test-subj="dashboardAddPanelButton"
                />,
                dashboardAppState.dashboardContainer.controlGroup?.getToolbarButtons(),
              ],
            }}
          </SolutionToolbar>
        </>
      ) : null}
    </>
  );
}
