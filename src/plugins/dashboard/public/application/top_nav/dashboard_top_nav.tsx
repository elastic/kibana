/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPE } from '@kbn/analytics';
import { EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import angular from 'angular';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import UseUnmount from 'react-use/lib/useUnmount';
import { BaseVisType, VisTypeAlias } from '../../../../visualizations/public';
import {
  AddFromLibraryButton,
  PrimaryActionButton,
  QuickButtonGroup,
  SolutionToolbar,
  QuickButtonProps,
} from '../../../../presentation_util/public';
import { useKibana } from '../../services/kibana_react';
import { IndexPattern, SavedQuery, TimefilterContract } from '../../services/data';
import { isErrorEmbeddable, openAddPanelFlyout, ViewMode } from '../../services/embeddable';
import {
  getSavedObjectFinder,
  SavedObjectSaveOpts,
  SaveResult,
  showSaveModal,
} from '../../services/saved_objects';

import { NavAction } from '../../types';
import { DashboardSavedObject } from '../..';
import { DashboardStateManager } from '../dashboard_state_manager';
import { saveDashboard } from '../lib';
import {
  DashboardAppServices,
  DashboardEmbedSettings,
  DashboardRedirect,
  DashboardSaveOptions,
} from '../types';
import { getTopNavConfig } from './get_top_nav_config';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { showOptionsPopover } from './show_options_popover';
import { TopNavIds } from './top_nav_ids';
import { ShowShareModal } from './show_share_modal';
import { confirmDiscardOrKeepUnsavedChanges } from '../listing/confirm_overlays';
import { OverlayRef } from '../../../../../core/public';
import { DashboardConstants } from '../../dashboard_constants';
import { getNewDashboardTitle, unsavedChangesBadge } from '../../dashboard_strings';
import { DASHBOARD_PANELS_UNSAVED_ID } from '../lib/dashboard_panel_storage';
import { DashboardContainer } from '..';
import { EditorMenu } from './editor_menu';

export interface DashboardTopNavState {
  chromeIsVisible: boolean;
  addPanelOverlay?: OverlayRef;
  savedQuery?: SavedQuery;
}

export interface DashboardTopNavProps {
  onQuerySubmit: (_payload: unknown, isUpdate: boolean | undefined) => void;
  dashboardStateManager: DashboardStateManager;
  dashboardContainer: DashboardContainer;
  embedSettings?: DashboardEmbedSettings;
  savedDashboard: DashboardSavedObject;
  timefilter: TimefilterContract;
  indexPatterns: IndexPattern[];
  redirectTo: DashboardRedirect;
  unsavedChanges: boolean;
  clearUnsavedChanges: () => void;
  lastDashboardId?: string;
  viewMode: ViewMode;
}

export function DashboardTopNav({
  dashboardStateManager,
  clearUnsavedChanges,
  dashboardContainer,
  lastDashboardId,
  unsavedChanges,
  savedDashboard,
  onQuerySubmit,
  embedSettings,
  indexPatterns,
  redirectTo,
  timefilter,
  viewMode,
}: DashboardTopNavProps) {
  const {
    core,
    data,
    share,
    chrome,
    embeddable,
    navigation,
    uiSettings,
    setHeaderActionMenu,
    savedObjectsTagging,
    dashboardCapabilities,
    dashboardPanelStorage,
    allowByValueEmbeddables,
    visualizations,
    usageCollection,
  } = useKibana<DashboardAppServices>().services;

  const [state, setState] = useState<DashboardTopNavState>({ chromeIsVisible: false });
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);

  const lensAlias = visualizations.getAliases().find(({ name }) => name === 'lens');
  const quickButtonVisTypes = ['markdown', 'maps'];
  const stateTransferService = embeddable.getStateTransfer();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const trackUiMetric = usageCollection?.reportUiCounter.bind(
    usageCollection,
    DashboardConstants.DASHBOARDS_ID
  );

  useEffect(() => {
    const visibleSubscription = chrome.getIsVisible$().subscribe((chromeIsVisible) => {
      setState((s) => ({ ...s, chromeIsVisible }));
    });
    const { id, title, getFullEditPath } = savedDashboard;
    if (id || allowByValueEmbeddables) {
      chrome.recentlyAccessed.add(
        getFullEditPath(dashboardStateManager.getIsEditMode()),
        title || getNewDashboardTitle(),
        id || DASHBOARD_PANELS_UNSAVED_ID
      );
    }
    return () => {
      visibleSubscription.unsubscribe();
    };
  }, [chrome, allowByValueEmbeddables, dashboardStateManager, savedDashboard]);

  const addFromLibrary = useCallback(() => {
    if (!isErrorEmbeddable(dashboardContainer)) {
      setState((s) => ({
        ...s,
        addPanelOverlay: openAddPanelFlyout({
          embeddable: dashboardContainer,
          getAllFactories: embeddable.getEmbeddableFactories,
          getFactory: embeddable.getEmbeddableFactory,
          notifications: core.notifications,
          overlays: core.overlays,
          SavedObjectFinder: getSavedObjectFinder(core.savedObjects, uiSettings),
        }),
      }));
    }
  }, [
    embeddable.getEmbeddableFactories,
    embeddable.getEmbeddableFactory,
    dashboardContainer,
    core.notifications,
    core.savedObjects,
    core.overlays,
    uiSettings,
  ]);

  const createNewVisType = useCallback(
    (visType?: BaseVisType | VisTypeAlias) => () => {
      let path = '';
      let appId = '';

      if (visType) {
        if (trackUiMetric) {
          trackUiMetric(METRIC_TYPE.CLICK, visType.name);
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
        },
      });
    },
    [trackUiMetric, stateTransferService]
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
      const isPageRefresh = newMode === dashboardStateManager.getViewMode();
      const isLeavingEditMode = !isPageRefresh && newMode === ViewMode.VIEW;
      const willLoseChanges = isLeavingEditMode && dashboardStateManager.getIsDirty(timefilter);

      function switchViewMode() {
        dashboardStateManager.switchViewMode(newMode);

        if (savedDashboard?.id && allowByValueEmbeddables) {
          const { getFullEditPath, title, id } = savedDashboard;
          chrome.recentlyAccessed.add(getFullEditPath(newMode === ViewMode.EDIT), title, id);
        }
      }

      if (!willLoseChanges) {
        switchViewMode();
        return;
      }

      function discardChanges() {
        dashboardStateManager.resetState();
        dashboardStateManager.clearUnsavedPanels();

        // We need to do a hard reset of the timepicker. appState will not reload like
        // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
        // reload will cause it not to sync.
        if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
          dashboardStateManager.syncTimefilterWithDashboardTime(timefilter);
          dashboardStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
        }
        dashboardStateManager.switchViewMode(ViewMode.VIEW);
      }
      confirmDiscardOrKeepUnsavedChanges(core.overlays).then((selection) => {
        if (selection === 'discard') {
          discardChanges();
        }
        if (selection !== 'cancel') {
          switchViewMode();
        }
      });
    },
    [
      timefilter,
      core.overlays,
      clearAddPanel,
      savedDashboard,
      dashboardStateManager,
      allowByValueEmbeddables,
      chrome.recentlyAccessed,
    ]
  );

  /**
   * Saves the dashboard.
   *
   * @param {object} [saveOptions={}]
   * @property {boolean} [saveOptions.confirmOverwrite=false] - If true, attempts to create the source so it
   * can confirm an overwrite if a document with the id already exists.
   * @property {boolean} [saveOptions.isTitleDuplicateConfirmed=false] - If true, save allowed with duplicate title
   * @property {func} [saveOptions.onTitleDuplicate] - function called if duplicate title exists.
   * When not provided, confirm modal will be displayed asking user to confirm or cancel save.
   * @return {Promise}
   * @resolved {String} - The id of the doc
   */
  const save = useCallback(
    async (saveOptions: SavedObjectSaveOpts) => {
      setIsSaveInProgress(true);
      return saveDashboard(angular.toJson, timefilter, dashboardStateManager, saveOptions)
        .then(function (id) {
          if (id) {
            core.notifications.toasts.addSuccess({
              title: i18n.translate('dashboard.dashboardWasSavedSuccessMessage', {
                defaultMessage: `Dashboard '{dashTitle}' was saved`,
                values: { dashTitle: dashboardStateManager.savedDashboard.title },
              }),
              'data-test-subj': 'saveDashboardSuccess',
            });

            dashboardPanelStorage.clearPanels(lastDashboardId);
            if (id !== lastDashboardId) {
              redirectTo({
                id,
                // editMode: true,
                destination: 'dashboard',
                useReplace: true,
              });
            } else {
              dashboardStateManager.resetState();
              chrome.docTitle.change(dashboardStateManager.savedDashboard.lastSavedTitle);
            }
          }
          setIsSaveInProgress(false);
          return { id };
        })
        .catch((error) => {
          core.notifications?.toasts.addDanger({
            title: i18n.translate('dashboard.dashboardWasNotSavedDangerMessage', {
              defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
              values: {
                dashTitle: dashboardStateManager.savedDashboard.title,
                errorMessage: error.message,
              },
            }),
            'data-test-subj': 'saveDashboardFailure',
          });
          return { error };
        });
    },
    [
      core.notifications.toasts,
      dashboardStateManager,
      dashboardPanelStorage,
      lastDashboardId,
      chrome.docTitle,
      redirectTo,
      timefilter,
    ]
  );

  const runSave = useCallback(async () => {
    const currentTitle = dashboardStateManager.getTitle();
    const currentDescription = dashboardStateManager.getDescription();
    const currentTimeRestore = dashboardStateManager.getTimeRestore();

    let currentTags: string[] = [];
    if (savedObjectsTagging) {
      const dashboard = dashboardStateManager.savedDashboard;
      if (savedObjectsTagging.ui.hasTagDecoration(dashboard)) {
        currentTags = dashboard.getTags();
      }
    }

    const onSave = ({
      newTitle,
      newDescription,
      newCopyOnSave,
      newTimeRestore,
      onTitleDuplicate,
      isTitleDuplicateConfirmed,
      newTags,
    }: DashboardSaveOptions): Promise<SaveResult> => {
      dashboardStateManager.setTitle(newTitle);
      dashboardStateManager.setDescription(newDescription);
      dashboardStateManager.savedDashboard.copyOnSave = newCopyOnSave;
      dashboardStateManager.setTimeRestore(newTimeRestore);
      if (savedObjectsTagging && newTags) {
        dashboardStateManager.setTags(newTags);
      }

      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };

      return save(saveOptions).then((response: SaveResult) => {
        // If the save wasn't successful, put the original values back.
        if (!(response as { id: string }).id) {
          dashboardStateManager.setTitle(currentTitle);
          dashboardStateManager.setDescription(currentDescription);
          dashboardStateManager.setTimeRestore(currentTimeRestore);
          if (savedObjectsTagging) {
            dashboardStateManager.setTags(currentTags);
          }
        }
        return response;
      });
    };

    const dashboardSaveModal = (
      <DashboardSaveModal
        onSave={onSave}
        onClose={() => {}}
        title={currentTitle}
        description={currentDescription}
        tags={currentTags}
        savedObjectsTagging={savedObjectsTagging}
        timeRestore={currentTimeRestore}
        showCopyOnSave={lastDashboardId ? true : false}
      />
    );
    clearAddPanel();
    showSaveModal(dashboardSaveModal, core.i18n.Context);
  }, [
    save,
    clearAddPanel,
    lastDashboardId,
    core.i18n.Context,
    savedObjectsTagging,
    dashboardStateManager,
  ]);

  const runQuickSave = useCallback(async () => {
    const currentTitle = dashboardStateManager.getTitle();
    const currentDescription = dashboardStateManager.getDescription();
    const currentTimeRestore = dashboardStateManager.getTimeRestore();

    let currentTags: string[] = [];
    if (savedObjectsTagging) {
      const dashboard = dashboardStateManager.savedDashboard;
      if (savedObjectsTagging.ui.hasTagDecoration(dashboard)) {
        currentTags = dashboard.getTags();
      }
    }

    setIsSaveInProgress(true);
    save({}).then((response: SaveResult) => {
      // If the save wasn't successful, put the original values back.
      if (!(response as { id: string }).id) {
        dashboardStateManager.setTitle(currentTitle);
        dashboardStateManager.setDescription(currentDescription);
        dashboardStateManager.setTimeRestore(currentTimeRestore);
        if (savedObjectsTagging) {
          dashboardStateManager.setTags(currentTags);
        }
      } else {
        clearUnsavedChanges();
      }
      setIsSaveInProgress(false);
      return response;
    });
  }, [save, savedObjectsTagging, dashboardStateManager, clearUnsavedChanges]);

  const runClone = useCallback(() => {
    const currentTitle = dashboardStateManager.getTitle();
    const onClone = async (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: () => void
    ) => {
      dashboardStateManager.savedDashboard.copyOnSave = true;
      dashboardStateManager.setTitle(newTitle);
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };
      return save(saveOptions).then((response: { id?: string } | { error: Error }) => {
        // If the save wasn't successful, put the original title back.
        if ((response as { error: Error }).error) {
          dashboardStateManager.setTitle(currentTitle);
        }
        return response;
      });
    };

    showCloneModal(onClone, currentTitle);
  }, [dashboardStateManager, save]);

  const dashboardTopNavActions = useMemo(() => {
    const actions = {
      [TopNavIds.FULL_SCREEN]: () => {
        dashboardStateManager.setFullScreenMode(true);
      },
      [TopNavIds.EXIT_EDIT_MODE]: () => onChangeViewMode(ViewMode.VIEW),
      [TopNavIds.ENTER_EDIT_MODE]: () => onChangeViewMode(ViewMode.EDIT),
      [TopNavIds.SAVE]: runSave,
      [TopNavIds.QUICK_SAVE]: runQuickSave,
      [TopNavIds.CLONE]: runClone,
      [TopNavIds.OPTIONS]: (anchorElement) => {
        showOptionsPopover({
          anchorElement,
          useMargins: dashboardStateManager.getUseMargins(),
          onUseMarginsChange: (isChecked: boolean) => {
            dashboardStateManager.setUseMargins(isChecked);
          },
          syncColors: dashboardStateManager.getSyncColors(),
          onSyncColorsChange: (isChecked: boolean) => {
            dashboardStateManager.setSyncColors(isChecked);
          },
          hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
          onHidePanelTitlesChange: (isChecked: boolean) => {
            dashboardStateManager.setHidePanelTitles(isChecked);
          },
        });
      },
    } as { [key: string]: NavAction };
    if (share) {
      actions[TopNavIds.SHARE] = (anchorElement) =>
        ShowShareModal({
          share,
          anchorElement,
          savedDashboard,
          dashboardStateManager,
          dashboardCapabilities,
        });
    }
    return actions;
  }, [
    dashboardCapabilities,
    dashboardStateManager,
    onChangeViewMode,
    savedDashboard,
    runClone,
    runSave,
    runQuickSave,
    share,
  ]);

  UseUnmount(() => {
    clearAddPanel();
  });

  const getNavBarProps = () => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || state.chromeIsVisible) && !dashboardStateManager.getFullScreenMode();

    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !forceHide &&
      (data.query.filterManager.getFilters().length > 0 ||
        !dashboardStateManager.getFullScreenMode());

    const isFullScreenMode = dashboardStateManager.getFullScreenMode();
    const screenTitle = dashboardStateManager.getTitle();
    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowQueryInput));
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showQueryBar = showQueryInput || showDatePicker;
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showSearchBar = showQueryBar || showFilterBar;

    const topNav = getTopNavConfig(viewMode, dashboardTopNavActions, {
      hideWriteControls: dashboardCapabilities.hideWriteControls,
      isNewDashboard: !savedDashboard.id,
      isDirty: dashboardStateManager.getIsDirty(timefilter),
      isSaveInProgress,
    });

    const badges = unsavedChanges
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
      showTopNavMenu,
      showSearchBar,
      showQueryBar,
      showQueryInput,
      showDatePicker,
      showFilterBar,
      setMenuMountPoint: embedSettings ? undefined : setHeaderActionMenu,
      indexPatterns,
      showSaveQuery: dashboardCapabilities.saveQuery,
      useDefaultBehaviors: true,
      onQuerySubmit,
      onSavedQueryUpdated: (savedQuery: SavedQuery) => {
        const allFilters = data.query.filterManager.getFilters();
        data.query.filterManager.setFilters(allFilters);
        dashboardStateManager.applyFilters(savedQuery.attributes.query, allFilters);
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
      savedQueryId: dashboardStateManager.getSavedQueryId(),
      onSavedQueryIdChange: (newId: string | undefined) =>
        dashboardStateManager.setSavedQueryId(newId),
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
      {viewMode !== ViewMode.VIEW ? (
        <>
          <EuiHorizontalRule margin="none" />
          <SolutionToolbar isDarkModeEnabled={IS_DARK_THEME}>
            {{
              primaryActionButton: (
                <PrimaryActionButton
                  isDarkModeEnabled={IS_DARK_THEME}
                  label={i18n.translate('dashboard.solutionToolbar.addPanelButtonLabel', {
                    defaultMessage: 'Create visualization',
                  })}
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
                  dashboardContainer={dashboardContainer}
                />,
              ],
            }}
          </SolutionToolbar>
        </>
      ) : null}
    </>
  );
}
