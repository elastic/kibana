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
import React from 'react';

import {
  EmbeddableFactoryNotFoundError,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../../embeddable/public';
import { useKibana } from '../../../../kibana_react/public';
import {
  getSavedObjectFinder,
  SavedObjectSaveOpts,
  SaveResult,
  showSaveModal,
} from '../../../../saved_objects/public';
import { NavAction } from '../../types';
import { saveDashboard } from '../lib';
import { DashboardAppServices, DashboardSaveOptions, DashboardTopNavProps } from '../types';
import { getTopNavConfig } from './get_top_nav_config';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { showOptionsPopover } from './show_options_popover';
import { TopNavIds } from './top_nav_ids';

export function DashboardTopNav({
  refreshDashboardContainer,
  dashboardStateManager,
  redirectToDashboard,
  dashboardContainer,
  lastDashboardId,
  savedDashboard,
  embedSettings,
  indexPatterns,
  timefilter,
}: DashboardTopNavProps) {
  const {
    core,
    overlays,
    chrome,
    embeddable,
    uiSettings,
    navigation,
    savedObjects,
    dashboardConfig,
    setHeaderActionMenu,
    savedObjectsTagging,
  } = useKibana<DashboardAppServices>().services;

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
  const runSave = async (saveOptions?: SavedObjectSaveOpts) => {
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

      const defaultSaveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };

      return saveDashboard(
        angular.toJson,
        timefilter,
        dashboardStateManager,
        saveOptions ?? defaultSaveOptions
      )
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
              redirectToDashboard({ id });
            } else {
              chrome.docTitle.change(dashboardStateManager.savedDashboard.lastSavedTitle);
              updateViewMode(ViewMode.VIEW);
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

          dashboardStateManager.setTitle(currentTitle);
          dashboardStateManager.setDescription(currentDescription);
          dashboardStateManager.setTimeRestore(currentTimeRestore);
          if (savedObjectsTagging) {
            dashboardStateManager.setTags(currentTags);
          }
          return { error };
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
    showSaveModal(dashboardSaveModal, core.i18n.Context);
  };

  const updateViewMode = (newMode: ViewMode) => {
    dashboardStateManager.switchViewMode(newMode);
  };

  const onChangeViewMode = (newMode: ViewMode) => {
    const isPageRefresh = newMode === dashboardStateManager.getViewMode();
    const isLeavingEditMode = !isPageRefresh && newMode === ViewMode.VIEW;
    const willLoseChanges = isLeavingEditMode && dashboardStateManager.getIsDirty(timefilter);

    if (!willLoseChanges) {
      updateViewMode(newMode);
      return;
    }

    function revertChangesAndExitEditMode() {
      dashboardStateManager.resetState();
      // This is only necessary for new dashboards, which will default to Edit mode.
      updateViewMode(ViewMode.VIEW);

      // We need to do a hard reset of the timepicker. appState will not reload like
      // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
      // reload will cause it not to sync.
      if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
        dashboardStateManager.syncTimefilterWithDashboardTime(timefilter);
        dashboardStateManager.syncTimefilterWithDashboardRefreshInterval(timefilter);
      }

      // Angular's $location skips this update because of history updates from syncState which happen simultaneously
      // when calling kbnUrl.change() angular schedules url update and when angular finally starts to process it,
      // the update is considered outdated and angular skips it
      // so have to use implementation of dashboardStateManager.changeDashboardUrl, which workarounds those issues
      redirectToDashboard({ id: savedDashboard.id });
    }

    overlays
      ?.openConfirm(
        i18n.translate('dashboard.changeViewModeConfirmModal.discardChangesDescription', {
          defaultMessage: `Once you discard your changes, there's no getting them back.`,
        }),
        {
          confirmButtonText: i18n.translate(
            'dashboard.changeViewModeConfirmModal.confirmButtonLabel',
            { defaultMessage: 'Discard changes' }
          ),
          cancelButtonText: i18n.translate(
            'dashboard.changeViewModeConfirmModal.cancelButtonLabel',
            { defaultMessage: 'Continue editing' }
          ),
          defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
          title: i18n.translate('dashboard.changeViewModeConfirmModal.discardChangesTitle', {
            defaultMessage: 'Discard changes to dashboard?',
          }),
        }
      )
      .then((isConfirmed) => {
        if (isConfirmed) {
          revertChangesAndExitEditMode();
        }
      });

    // updateNavBar();
  };

  const runClone = () => {
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
      runSave(saveOptions);
    };

    showCloneModal(onClone, currentTitle);
  };

  const dashboardTopNavActions = {
    [TopNavIds.FULL_SCREEN]: () => {
      dashboardStateManager.setFullScreenMode(true);
    },
    [TopNavIds.EXIT_EDIT_MODE]: () => onChangeViewMode(ViewMode.VIEW),
    [TopNavIds.ENTER_EDIT_MODE]: () => onChangeViewMode(ViewMode.EDIT),
    [TopNavIds.SAVE]: runSave,
    [TopNavIds.CLONE]: runClone,
    [TopNavIds.ADD_EXISTING]: () => {
      if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
        openAddPanelFlyout({
          embeddable: dashboardContainer,
          getAllFactories: embeddable.getEmbeddableFactories,
          getFactory: embeddable.getEmbeddableFactory,
          notifications: core.notifications,
          overlays: core.overlays,
          SavedObjectFinder: getSavedObjectFinder(savedObjects, uiSettings),
        });
      }
    },
    [TopNavIds.VISUALIZE]: async () => {
      const type = 'visualization';
      const factory = embeddable.getEmbeddableFactory(type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(type);
      }
      const explicitInput = await factory.getExplicitInput();
      if (dashboardContainer) {
        await dashboardContainer.addNewEmbeddable(type, explicitInput);
      }
    },
    [TopNavIds.OPTIONS]: (anchorElement) => {
      showOptionsPopover({
        anchorElement,
        useMargins: dashboardStateManager.getUseMargins(),
        onUseMarginsChange: (isChecked: boolean) => {
          dashboardStateManager.setUseMargins(isChecked);
        },
        hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
        onHidePanelTitlesChange: (isChecked: boolean) => {
          dashboardStateManager.setHidePanelTitles(isChecked);
        },
      });
    },
  } as { [key: string]: NavAction };

  const getNavBarProps = () => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      !dashboardStateManager.getFullScreenMode();
    // (forceShow || $scope.isVisible) && !dashboardStateManager.getFullScreenMode();

    const shouldShowFilterBar = (forceHide: boolean): boolean =>
      !dashboardStateManager.getFullScreenMode();
    // !forceHide && ($scope.model.filters.length > 0 || !dashboardStateManager.getFullScreenMode());

    const isFullScreenMode = dashboardStateManager.getFullScreenMode();
    const screenTitle = dashboardStateManager.getTitle();
    const showTopNavMenu = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowTopNavMenu));
    const showQueryInput = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowQueryInput));
    const showDatePicker = shouldShowNavBarComponent(Boolean(embedSettings?.forceShowDatePicker));
    const showQueryBar = showQueryInput || showDatePicker;
    const showFilterBar = shouldShowFilterBar(Boolean(embedSettings?.forceHideFilterBar));
    const showSearchBar = showQueryBar || showFilterBar;

    const topNav = getTopNavConfig(
      dashboardStateManager.getViewMode(),
      dashboardTopNavActions,
      dashboardConfig.getHideWriteControls()
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
      setMenuMountPoint: setHeaderActionMenu,
      indexPatterns,
      // showSaveQuery: $scope.showSaveQuery,
      // savedQuery: $scope.savedQuery,
      // onSavedQueryIdChange,
      savedQueryId: dashboardStateManager.getSavedQueryId(),
      useDefaultBehaviors: true,
      onQuerySubmit: refreshDashboardContainer,
    };
  };

  const { TopNavMenu } = navigation.ui;
  return <TopNavMenu {...getNavBarProps()} />;
}
