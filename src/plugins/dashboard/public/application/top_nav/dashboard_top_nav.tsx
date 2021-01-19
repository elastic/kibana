/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import angular from 'angular';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useKibana } from '../../services/kibana_react';
import { IndexPattern, SavedQuery, TimefilterContract } from '../../services/data';
import {
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../services/embeddable';
import {
  getSavedObjectFinder,
  SavedObjectSaveOpts,
  SaveResult,
  showSaveModal,
} from '../../services/saved_objects';

import { NavAction } from '../../types';
import { DashboardSavedObject } from '../..';
import { DashboardStateManager } from '../dashboard_state_manager';
import { leaveConfirmStrings } from '../../dashboard_strings';
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
import { PanelToolbar } from './panel_toolbar';
import { OverlayRef } from '../../../../../core/public';
import { DashboardContainer } from '..';

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
  lastDashboardId?: string;
  viewMode: ViewMode;
}

export function DashboardTopNav({
  dashboardStateManager,
  dashboardContainer,
  lastDashboardId,
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
  } = useKibana<DashboardAppServices>().services;

  const [state, setState] = useState<DashboardTopNavState>({ chromeIsVisible: false });

  useEffect(() => {
    const visibleSubscription = chrome.getIsVisible$().subscribe((chromeIsVisible) => {
      setState((s) => ({ ...s, chromeIsVisible }));
    });
    return () => visibleSubscription.unsubscribe();
  }, [chrome]);

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

  const createNew = useCallback(async () => {
    const type = 'visualization';
    const factory = embeddable.getEmbeddableFactory(type);
    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }
    await factory.create({} as EmbeddableInput, dashboardContainer);
  }, [dashboardContainer, embeddable]);

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

      if (!willLoseChanges) {
        dashboardStateManager.switchViewMode(newMode);
        return;
      }

      function revertChangesAndExitEditMode() {
        dashboardStateManager.resetState();
        // This is only necessary for new dashboards, which will default to Edit mode.
        dashboardStateManager.switchViewMode(ViewMode.VIEW);

        // We need to do a hard reset of the timepicker. appState will not reload like
        // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
        // reload will cause it not to sync.
        if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
          dashboardStateManager.syncTimefilterWithDashboardTime(timefilter);
          dashboardStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
        }
        redirectTo({ destination: 'dashboard', id: savedDashboard.id });
      }

      core.overlays
        .openConfirm(leaveConfirmStrings.getDiscardSubtitle(), {
          confirmButtonText: leaveConfirmStrings.getConfirmButtonText(),
          cancelButtonText: leaveConfirmStrings.getCancelButtonText(),
          defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
          title: leaveConfirmStrings.getDiscardTitle(),
        })
        .then((isConfirmed) => {
          if (isConfirmed) {
            revertChangesAndExitEditMode();
          }
        });
    },
    [redirectTo, timefilter, core.overlays, savedDashboard.id, dashboardStateManager, clearAddPanel]
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

            if (id !== lastDashboardId) {
              redirectTo({ destination: 'dashboard', id });
            } else {
              chrome.docTitle.change(dashboardStateManager.savedDashboard.lastSavedTitle);
              dashboardStateManager.switchViewMode(ViewMode.VIEW);
            }
          }
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
      [TopNavIds.CLONE]: runClone,
      [TopNavIds.ADD_EXISTING]: addFromLibrary,
      [TopNavIds.VISUALIZE]: createNew,
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
    addFromLibrary,
    createNew,
    runClone,
    runSave,
    share,
  ]);

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

    const topNav = getTopNavConfig(
      viewMode,
      dashboardTopNavActions,
      dashboardCapabilities.hideWriteControls
    );

    return {
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
  return (
    <>
      <TopNavMenu {...getNavBarProps()} />
      {viewMode !== ViewMode.VIEW ? (
        <PanelToolbar onAddPanelClick={createNew} onLibraryClick={addFromLibrary} />
      ) : null}
    </>
  );
}
