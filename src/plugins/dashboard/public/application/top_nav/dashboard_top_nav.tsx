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

import { EuiCheckboxGroup, EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';
import { EuiCheckboxGroupIdToSelectedMap } from '@elastic/eui/src/components/form/checkbox/checkbox_group';

import { i18n } from '@kbn/i18n';
import angular from 'angular';
import React, { ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { createDashboardEditUrl, DashboardConstants } from '../..';

import { ViewMode } from '../../../../embeddable/public';
import { useKibana } from '../../../../kibana_react/public';
import { setStateToKbnUrl, unhashUrl } from '../../../../kibana_utils/public';
import { SavedObjectSaveOpts, SaveResult, showSaveModal } from '../../../../saved_objects/public';
import { NavAction } from '../../types';
import { UrlParams } from '../dashboard_router';
import { leaveConfirmStrings } from '../dashboard_strings';
import { saveDashboard } from '../lib';
import { DashboardAppServices, DashboardSaveOptions, DashboardTopNavProps } from '../types';
import { getTopNavConfig } from './get_top_nav_config';
import { DashboardSaveModal } from './save_modal';
import { showCloneModal } from './show_clone_modal';
import { showOptionsPopover } from './show_options_popover';
import { TopNavIds } from './top_nav_ids';

interface UrlParamsSelectedMap {
  [UrlParams.SHOW_TOP_MENU]: boolean;
  [UrlParams.SHOW_QUERY_INPUT]: boolean;
  [UrlParams.SHOW_TIME_FILTER]: boolean;
  [UrlParams.SHOW_FILTER_BAR]: boolean;
}

interface UrlParamValues extends Omit<UrlParamsSelectedMap, UrlParams.SHOW_FILTER_BAR> {
  [UrlParams.HIDE_FILTER_BAR]: boolean;
}

export function DashboardTopNav({
  dashboardStateManager,
  redirectToDashboard,
  lastDashboardId,
  updateViewMode,
  addFromLibrary,
  savedDashboard,
  onQuerySubmit,
  embedSettings,
  indexPatterns,
  timefilter,
  createNew,
}: DashboardTopNavProps) {
  const {
    core,
    data,
    share,
    chrome,
    navigation,
    setHeaderActionMenu,
    savedObjectsTagging,
    dashboardCapabilities,
  } = useKibana<DashboardAppServices>().services;

  const [chromeIsVisible, setChromeIsVisible] = useState(false);

  useEffect(() => {
    const visibleSubscription = chrome.getIsVisible$().subscribe((isVisible) => {
      setChromeIsVisible(isVisible);
    });
    return () => visibleSubscription.unsubscribe();
  }, [chrome]);

  const onChangeViewMode = useCallback(
    (newMode: ViewMode) => {
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
        // redirectToDashboard({ id: savedDashboard.id });
        dashboardStateManager.changeDashboardUrl(
          savedDashboard.id
            ? createDashboardEditUrl(savedDashboard.id)
            : DashboardConstants.CREATE_NEW_DASHBOARD_URL
        );
      }

      core.overlays
        .openConfirm(leaveConfirmStrings.discardSubtitle, {
          confirmButtonText: leaveConfirmStrings.confirmButtonText,
          cancelButtonText: leaveConfirmStrings.cancelButtonText,
          defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
          title: leaveConfirmStrings.discardTitle,
        })
        .then((isConfirmed) => {
          if (isConfirmed) {
            revertChangesAndExitEditMode();
          }
        });
    },
    [
      timefilter,
      core.overlays,
      updateViewMode,
      savedDashboard.id,
      dashboardStateManager,
      // redirectToDashboard,
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
              redirectToDashboard({ id });
              // dashboardStateManager.changeDashboardUrl(createDashboardEditUrl(id));
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
          return { error };
        });
    },
    [
      core.notifications.toasts,
      dashboardStateManager,
      redirectToDashboard,
      lastDashboardId,
      chrome.docTitle,
      updateViewMode,
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
    showSaveModal(dashboardSaveModal, core.i18n.Context);
  }, [save, core.i18n.Context, savedObjectsTagging, dashboardStateManager, lastDashboardId]);

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
          hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
          onHidePanelTitlesChange: (isChecked: boolean) => {
            dashboardStateManager.setHidePanelTitles(isChecked);
          },
        });
      },
    } as { [key: string]: NavAction };
    if (share) {
      actions[TopNavIds.SHARE] = (anchorElement) => {
        const EmbedUrlParamExtension = ({
          setParamValue,
        }: {
          setParamValue: (paramUpdate: UrlParamValues) => void;
        }): ReactElement => {
          const [urlParamsSelectedMap, setUrlParamsSelectedMap] = useState<UrlParamsSelectedMap>({
            [UrlParams.SHOW_TOP_MENU]: false,
            [UrlParams.SHOW_QUERY_INPUT]: false,
            [UrlParams.SHOW_TIME_FILTER]: false,
            [UrlParams.SHOW_FILTER_BAR]: true,
          });

          const checkboxes = [
            {
              id: UrlParams.SHOW_TOP_MENU,
              label: i18n.translate('dashboard.embedUrlParamExtension.topMenu', {
                defaultMessage: 'Top menu',
              }),
            },
            {
              id: UrlParams.SHOW_QUERY_INPUT,
              label: i18n.translate('dashboard.embedUrlParamExtension.query', {
                defaultMessage: 'Query',
              }),
            },
            {
              id: UrlParams.SHOW_TIME_FILTER,
              label: i18n.translate('dashboard.embedUrlParamExtension.timeFilter', {
                defaultMessage: 'Time filter',
              }),
            },
            {
              id: UrlParams.SHOW_FILTER_BAR,
              label: i18n.translate('dashboard.embedUrlParamExtension.filterBar', {
                defaultMessage: 'Filter bar',
              }),
            },
          ];

          const handleChange = (param: string): void => {
            const urlParamsSelectedMapUpdate = {
              ...urlParamsSelectedMap,
              [param]: !urlParamsSelectedMap[param as keyof UrlParamsSelectedMap],
            };
            setUrlParamsSelectedMap(urlParamsSelectedMapUpdate);

            const urlParamValues = {
              [UrlParams.SHOW_TOP_MENU]: urlParamsSelectedMap[UrlParams.SHOW_TOP_MENU],
              [UrlParams.SHOW_QUERY_INPUT]: urlParamsSelectedMap[UrlParams.SHOW_QUERY_INPUT],
              [UrlParams.SHOW_TIME_FILTER]: urlParamsSelectedMap[UrlParams.SHOW_TIME_FILTER],
              [UrlParams.HIDE_FILTER_BAR]: !urlParamsSelectedMap[UrlParams.SHOW_FILTER_BAR],
              [param === UrlParams.SHOW_FILTER_BAR ? UrlParams.HIDE_FILTER_BAR : param]:
                param === UrlParams.SHOW_FILTER_BAR
                  ? urlParamsSelectedMap[UrlParams.SHOW_FILTER_BAR]
                  : !urlParamsSelectedMap[param as keyof UrlParamsSelectedMap],
            };
            setParamValue(urlParamValues);
          };

          return (
            <EuiCheckboxGroup
              options={checkboxes}
              idToSelectedMap={(urlParamsSelectedMap as unknown) as EuiCheckboxGroupIdToSelectedMap}
              onChange={handleChange}
              legend={{
                children: i18n.translate('dashboard.embedUrlParamExtension.include', {
                  defaultMessage: 'Include',
                }),
              }}
              data-test-subj="embedUrlParamExtension"
            />
          );
        };

        share.toggleShareContextMenu({
          anchorElement,
          allowEmbed: true,
          allowShortUrl:
            !dashboardCapabilities.hideWriteControls || dashboardCapabilities.createShortUrl,
          shareableUrl: setStateToKbnUrl(
            '_a',
            dashboardStateManager.getAppState(),
            { useHash: false, storeInHashQuery: true },
            unhashUrl(window.location.href)
          ),
          objectId: savedDashboard.id,
          objectType: 'dashboard',
          sharingData: {
            title: savedDashboard.title,
          },
          isDirty: dashboardStateManager.getIsDirty(),
          embedUrlParamExtensions: [
            {
              paramName: 'embed',
              component: EmbedUrlParamExtension,
            },
          ],
        });
      };
    }
    return actions;
  }, [
    dashboardCapabilities.hideWriteControls,
    dashboardCapabilities.createShortUrl,
    dashboardStateManager,
    savedDashboard.title,
    savedDashboard.id,
    onChangeViewMode,
    addFromLibrary,
    createNew,
    runClone,
    runSave,
    share,
  ]);

  const getNavBarProps = () => {
    const shouldShowNavBarComponent = (forceShow: boolean): boolean =>
      (forceShow || chromeIsVisible) && !dashboardStateManager.getFullScreenMode();

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
      dashboardStateManager.getViewMode(),
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
      // savedQuery: $scope.savedQuery,
      // onSavedQueryIdChange,
      savedQueryId: dashboardStateManager.getSavedQueryId(),
      useDefaultBehaviors: true,
      onQuerySubmit,
    };
  };

  const { TopNavMenu } = navigation.ui;
  return <TopNavMenu {...getNavBarProps()} />;
}
