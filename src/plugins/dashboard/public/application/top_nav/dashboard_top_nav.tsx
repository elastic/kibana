/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import UseUnmount from 'react-use/lib/useUnmount';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  withSuspense,
  LazyLabsFlyout,
  SolutionToolbar,
  QuickButtonGroup,
  QuickButtonProps,
  PrimaryActionButton,
  AddFromLibraryButton,
} from '@kbn/presentation-util-plugin/public';
import {
  showSaveModal,
  type SaveResult,
  getSavedObjectFinder,
} from '@kbn/saved-objects-plugin/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { Required } from '@kbn/utility-types';
import { EuiHorizontalRule } from '@elastic/eui';
import type { OverlayRef } from '@kbn/core/public';
import type { SavedQuery } from '@kbn/data-plugin/common';
import type { TopNavMenuProps } from '@kbn/navigation-plugin/public';
import type { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import {
  EmbeddableFactory,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '@kbn/embeddable-plugin/public';

import {
  setFullScreenMode,
  setHidePanelTitles,
  setSavedQueryId,
  setStateFromSaveModal,
  setSyncColors,
  setSyncTooltips,
  setSyncCursor,
  setUseMargins,
  setViewMode,
  useDashboardDispatch,
  useDashboardSelector,
} from '../state';
import { TopNavIds } from './top_nav_ids';
import { EditorMenu } from './editor_menu';
import { UI_SETTINGS } from '../../../common';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { ShowShareModal } from './show_share_modal';
import { getTopNavConfig } from './get_top_nav_config';
import { showOptionsPopover } from './show_options_popover';
import { pluginServices } from '../../services/plugin_services';
import { DashboardEmbedSettings, DashboardRedirect, DashboardState } from '../../types';
import { confirmDiscardUnsavedChanges } from '../listing/confirm_overlays';
import { useDashboardMountContext } from '../hooks/dashboard_mount_context';
import { DashboardConstants, getFullEditPath } from '../../dashboard_constants';
import { DashboardAppState, DashboardSaveOptions, NavAction } from '../../types';
import {
  dashboardReplacePanelAction,
  getCreateVisualizationButtonTitle,
  unsavedChangesBadge,
} from '../../dashboard_strings';

export interface DashboardTopNavState {
  chromeIsVisible: boolean;
  addPanelOverlay?: OverlayRef;
  savedQuery?: SavedQuery;
  isSaveInProgress?: boolean;
}

type CompleteDashboardAppState = Required<
  DashboardAppState,
  'getLatestDashboardState' | 'dashboardContainer'
>;

export const isCompleteDashboardAppState = (
  state: DashboardAppState
): state is CompleteDashboardAppState => {
  return Boolean(state.getLatestDashboardState) && Boolean(state.dashboardContainer);
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
    dashboardSavedObject: {
      checkForDuplicateDashboardTitle,
      saveDashboardStateToSavedObject,
      savedObjectsClient,
    },
    chrome: {
      getIsVisible$: getChromeIsVisible$,
      recentlyAccessed: chromeRecentlyAccessed,
      docTitle,
    },
    coreContext: { i18nContext },
    share,
    overlays,
    notifications,
    usageCollection,
    data: { query, search },
    navigation: { TopNavMenu },
    settings: { uiSettings, theme },
    initializerContext: { allowByValueEmbeddables },
    dashboardCapabilities: { showWriteControls, saveQuery: showSaveQuery },
    savedObjectsTagging: { hasApi: hasSavedObjectsTagging },
    embeddable: { getEmbeddableFactory, getEmbeddableFactories, getStateTransfer },
    visualizations: { get: getVisualization, getAliases: getVisTypeAliases },
  } = pluginServices.getServices();

  const dispatchDashboardStateChange = useDashboardDispatch();
  const dashboardState = useDashboardSelector((state) => state.dashboardStateReducer);

  const [mounted, setMounted] = useState(true);
  const [state, setState] = useState<DashboardTopNavState>({ chromeIsVisible: false });
  const [isLabsShown, setIsLabsShown] = useState(false);

  const lensAlias = getVisTypeAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes: Array<
    { type: 'vis'; visType: string } | { type: 'embeddable'; embeddableType: string }
  > = [
    { type: 'vis', visType: 'markdown' },
    { type: 'embeddable', embeddableType: 'IMAGE_EMBEDDABLE' },
    { type: 'vis', visType: 'maps' },
  ];
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
    const { savedObjectId, title, viewMode } = dashboardState;
    if (savedObjectId && title) {
      chromeRecentlyAccessed.add(
        getFullEditPath(savedObjectId, viewMode === ViewMode.EDIT),
        title,
        savedObjectId
      );
    }
    return () => {
      visibleSubscription.unsubscribe();
    };
  }, [allowByValueEmbeddables, chromeRecentlyAccessed, dashboardState, getChromeIsVisible$]);

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
          SavedObjectFinder: getSavedObjectFinder({ client: savedObjectsClient }, uiSettings),
          reportUiCounter: usageCollection.reportUiCounter,
          theme,
        }),
      }));
    }
  }, [
    dashboardAppState.dashboardContainer,
    usageCollection.reportUiCounter,
    getEmbeddableFactories,
    getEmbeddableFactory,
    savedObjectsClient,
    notifications,
    overlays,
    uiSettings,
    theme,
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

  const createNewEmbeddable = useCallback(
    async (embeddableFactory: EmbeddableFactory) => {
      if (trackUiMetric) {
        trackUiMetric(METRIC_TYPE.CLICK, embeddableFactory.type);
      }

      const explicitInput = await embeddableFactory.getExplicitInput();
      const newEmbeddable = await dashboardAppState.dashboardContainer.addNewEmbeddable(
        embeddableFactory.type,
        explicitInput
      );

      if (newEmbeddable) {
        pluginServices.getServices().notifications.toasts.addSuccess({
          title: dashboardReplacePanelAction.getSuccessMessage(newEmbeddable.getTitle()),
          'data-test-subj': 'addEmbeddableToDashboardSuccess',
        });
      }
    },
    [trackUiMetric, dashboardAppState.dashboardContainer]
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
      const {
        timefilter: { timefilter },
      } = query;

      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
        saveAsCopy: newCopyOnSave,
      };
      const stateFromSaveModal: Pick<
        DashboardState,
        'title' | 'description' | 'timeRestore' | 'timeRange' | 'refreshInterval' | 'tags'
      > = {
        title: newTitle,
        tags: [] as string[],
        description: newDescription,
        timeRestore: newTimeRestore,
        timeRange: newTimeRestore ? timefilter.getTime() : undefined,
        refreshInterval: newTimeRestore ? timefilter.getRefreshInterval() : undefined,
      };
      if (hasSavedObjectsTagging && newTags) {
        // remove `hasSavedObjectsTagging` once the savedObjectsTagging service is optional
        stateFromSaveModal.tags = newTags;
      }

      if (
        !(await checkForDuplicateDashboardTitle({
          title: newTitle,
          onTitleDuplicate,
          lastSavedTitle: currentState.title,
          copyOnSave: newCopyOnSave,
          isTitleDuplicateConfirmed,
        }))
      ) {
        // do not save if title is duplicate and is unconfirmed
        return {};
      }

      const saveResult = await saveDashboardStateToSavedObject({
        redirectTo,
        saveOptions,
        currentState: { ...currentState, ...stateFromSaveModal },
      });
      if (saveResult.id && !saveResult.redirected) {
        dispatchDashboardStateChange(setStateFromSaveModal(stateFromSaveModal));
        setTimeout(() => {
          /**
           * set timeout so dashboard state subject can update with the new title before updating the last saved state.
           * TODO: Remove this timeout once the last saved state is also handled in Redux.
           **/
          dashboardAppState.updateLastSavedState?.();
          docTitle.change(stateFromSaveModal.title);
        }, 1);
      }
      return saveResult.id ? { id: saveResult.id } : { error: new Error(saveResult.error) };
    };

    const lastDashboardId = currentState.savedObjectId;

    const dashboardSaveModal = (
      <DashboardSaveModal
        onSave={onSave}
        onClose={() => {}}
        tags={currentState.tags}
        title={currentState.title}
        timeRestore={currentState.timeRestore}
        description={currentState.description}
        showCopyOnSave={lastDashboardId ? true : false}
      />
    );
    closeAllFlyouts();
    showSaveModal(dashboardSaveModal, i18nContext);
  }, [
    saveDashboardStateToSavedObject,
    checkForDuplicateDashboardTitle,
    dispatchDashboardStateChange,
    hasSavedObjectsTagging,
    dashboardAppState,
    closeAllFlyouts,
    i18nContext,
    redirectTo,
    docTitle,
    query,
  ]);

  const runQuickSave = useCallback(async () => {
    setState((s) => ({ ...s, isSaveInProgress: true }));
    const currentState = dashboardAppState.getLatestDashboardState();
    const saveResult = await saveDashboardStateToSavedObject({
      redirectTo,
      currentState,
      saveOptions: {},
    });
    if (saveResult.id && !saveResult.redirected) {
      dashboardAppState.updateLastSavedState?.();
    }
    // turn off save in progress after the next change check. This prevents the save button from flashing
    setTimeout(() => {
      if (!mounted) return;
      setState((s) => ({ ...s, isSaveInProgress: false }));
    }, DashboardConstants.CHANGE_CHECK_DEBOUNCE);
  }, [dashboardAppState, saveDashboardStateToSavedObject, redirectTo, mounted]);

  const runClone = useCallback(() => {
    const currentState = dashboardAppState.getLatestDashboardState();
    const onClone = async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      if (
        !(await checkForDuplicateDashboardTitle({
          title: newTitle,
          onTitleDuplicate,
          lastSavedTitle: currentState.title,
          copyOnSave: true,
          isTitleDuplicateConfirmed,
        }))
      ) {
        // do not clone if title is duplicate and is unconfirmed
        return {};
      }

      const saveResult = await saveDashboardStateToSavedObject({
        redirectTo,
        saveOptions: { saveAsCopy: true },
        currentState: { ...currentState, title: newTitle },
      });
      return saveResult.id ? { id: saveResult.id } : { error: saveResult.error };
    };
    showCloneModal({ onClone, title: currentState.title });
  }, [
    checkForDuplicateDashboardTitle,
    saveDashboardStateToSavedObject,
    dashboardAppState,
    redirectTo,
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
        syncCursor: currentState.options.syncCursor ?? true,
        onSyncCursorChange: (isChecked: boolean) => {
          dispatchDashboardStateChange(setSyncCursor(isChecked));
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
    const { hasUnsavedChanges } = dashboardAppState;
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
        isLabsEnabled,
        showWriteControls,
        isSaveInProgress: state.isSaveInProgress,
        isNewDashboard: !dashboardState.savedObjectId,
        isDirty: Boolean(dashboardAppState.hasUnsavedChanges),
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
      screenTitle,
      showSearchBar,
      showFilterBar,
      showSaveQuery,
      showQueryInput,
      showDatePicker,
      appName: 'dashboard',
      useDefaultBehaviors: true,
      visible: printMode !== true,
      savedQuery: state.savedQuery,
      savedQueryId: dashboardState.savedQuery,
      indexPatterns: dashboardAppState.dataViews,
      config: showTopNavMenu ? topNav : undefined,
      setMenuMountPoint: embedSettings ? undefined : setHeaderActionMenu,
      className: isFullScreenMode ? 'kbnTopNavMenu-isFullScreen' : undefined,
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

  const getVisTypeQuickButton = (quickButtonForType: typeof quickButtonVisTypes[0]) => {
    if (quickButtonForType.type === 'vis') {
      const visTypeName = quickButtonForType.visType;
      const visType =
        getVisualization(visTypeName) ||
        getVisTypeAliases().find(({ name }) => name === visTypeName);

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
    } else {
      const embeddableType = quickButtonForType.embeddableType;
      const embeddableFactory = getEmbeddableFactory(embeddableType);
      return {
        iconType: embeddableFactory?.getIconType(),
        createType: embeddableFactory?.getDisplayName(),
        onClick: () => {
          if (embeddableFactory) {
            createNewEmbeddable(embeddableFactory);
          }
        },
        'data-test-subj': `dashboardQuickButton${embeddableType}`,
      };
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
                  createNewEmbeddable={createNewEmbeddable}
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
