/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { EuiHorizontalRule } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import type { Required } from '@kbn/utility-types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import UseUnmount from 'react-use/lib/useUnmount';
import type { OverlayRef } from '../../../../../core/public/overlays/types';
import type { SavedQuery } from '../../../../data/public/query/saved_query/types';
import { ViewMode } from '../../../../embeddable/common/types';
import { isErrorEmbeddable } from '../../../../embeddable/public/lib/embeddables/error_embeddable';
import { openAddPanelFlyout } from '../../../../embeddable/public/lib/panel/panel_header/panel_actions/add_panel/open_add_panel_flyout';
import { useKibana } from '../../../../kibana_react/public/context/context';
import type { TopNavMenuProps } from '../../../../navigation/public/top_nav_menu/top_nav_menu';
import { LazyLabsFlyout, withSuspense } from '../../../../presentation_util/public/components';
import { AddFromLibraryButton } from '../../../../presentation_util/public/components/solution_toolbar/items/add_from_library';
import { PrimaryActionButton } from '../../../../presentation_util/public/components/solution_toolbar/items/primary_button';
import type { QuickButtonProps } from '../../../../presentation_util/public/components/solution_toolbar/items/quick_group';
import { QuickButtonGroup } from '../../../../presentation_util/public/components/solution_toolbar/items/quick_group';
import { SolutionToolbar } from '../../../../presentation_util/public/components/solution_toolbar/solution_toolbar';
import { getSavedObjectFinder } from '../../../../saved_objects/public/finder/saved_object_finder';
import type { SaveResult } from '../../../../saved_objects/public/save_modal/show_saved_object_save_modal';
import { showSaveModal } from '../../../../saved_objects/public/save_modal/show_saved_object_save_modal';
import { BaseVisType } from '../../../../visualizations/public/vis_types/base_vis_type';
import type { VisTypeAlias } from '../../../../visualizations/public/vis_types/vis_type_alias_registry';
import { UI_SETTINGS } from '../../../common';
import { DashboardConstants } from '../../dashboard_constants';
import { getCreateVisualizationButtonTitle, unsavedChangesBadge } from '../../dashboard_strings';
import type {
  DashboardAppServices,
  DashboardAppState,
  DashboardEmbedSettings,
  DashboardRedirect,
  DashboardSaveOptions,
  NavAction,
} from '../../types';
import { saveDashboard } from '../lib/save_dashboard';
import { confirmDiscardUnsavedChanges } from '../listing/confirm_overlays';
import { useDashboardDispatch, useDashboardSelector } from '../state/dashboard_state_hooks';
import {
  setFullScreenMode,
  setHidePanelTitles,
  setSavedQueryId,
  setStateFromSaveModal,
  setSyncColors,
  setUseMargins,
  setViewMode,
} from '../state/dashboard_state_slice';
import { EditorMenu } from './editor_menu';
import { getTopNavConfig } from './get_top_nav_config';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { showOptionsPopover } from './show_options_popover';
import { ShowShareModal } from './show_share_modal';
import { TopNavIds } from './top_nav_ids';

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
}

const LabsFlyout = withSuspense(LazyLabsFlyout, null);

export function DashboardTopNav({
  dashboardAppState,
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
    visualizations,
    usageCollection,
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
  const [isLabsShown, setIsLabsShown] = useState(false);

  const lensAlias = visualizations.getAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes = ['markdown', 'maps'];
  const stateTransferService = embeddable.getStateTransfer();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');
  const isLabsEnabled = uiSettings.get(UI_SETTINGS.ENABLE_LABS_UI);

  const trackUiMetric = usageCollection?.reportUiCounter.bind(
    usageCollection,
    DashboardConstants.DASHBOARD_ID
  );

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
          reportUiCounter: usageCollection?.reportUiCounter,
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
          searchSessionId: data.search.session.getSessionId(),
        },
      });
    },
    [stateTransferService, data.search.session, trackUiMetric]
  );

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
        chrome.docTitle.change(stateFromSaveModal.title);
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
    chrome.docTitle,
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
        isDirty: Boolean(dashboardAppState.hasUnsavedChanges),
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
      savedQuery: state.savedQuery,
      savedQueryId: dashboardState.savedQuery,
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

  const { TopNavMenu } = navigation.ui;

  const getVisTypeQuickButton = (visTypeName: string) => {
    const visType =
      visualizations.get(visTypeName) ||
      visualizations.getAliases().find(({ name }) => name === visTypeName);

    if (visType) {
      if ('aliasPath' in visType) {
        const { name, icon, title } = visType as VisTypeAlias;

        return {
          iconType: icon,
          createType: title,
          onClick: createNewVisType(visType as VisTypeAlias),
          'data-test-subj': `dashboardQuickButton${name}`,
          isDarkModeEnabled: IS_DARK_THEME,
        };
      } else {
        const { name, icon, title, titleInWizard } = visType as BaseVisType;

        return {
          iconType: icon,
          createType: titleInWizard || title,
          onClick: createNewVisType(visType as BaseVisType),
          'data-test-subj': `dashboardQuickButton${name}`,
          isDarkModeEnabled: IS_DARK_THEME,
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
      {isLabsEnabled && isLabsShown ? (
        <LabsFlyout solutions={['dashboard']} onClose={() => setIsLabsShown(false)} />
      ) : null}
      {dashboardState.viewMode !== ViewMode.VIEW ? (
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
              addFromLibraryButton: (
                <AddFromLibraryButton
                  onClick={addFromLibrary}
                  data-test-subj="dashboardAddPanelButton"
                />
              ),
              extraButtons: [
                <EditorMenu
                  createNewVisType={createNewVisType}
                  dashboardContainer={dashboardAppState.dashboardContainer}
                />,
              ],
            }}
          </SolutionToolbar>
        </>
      ) : null}
    </>
  );
}
