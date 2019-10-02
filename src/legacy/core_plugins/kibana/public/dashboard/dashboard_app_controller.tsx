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

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import angular from 'angular';
import { uniq } from 'lodash';

import chrome from 'ui/chrome';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
import { toastNotifications } from 'ui/notify';

// @ts-ignore
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';

import { docTitle } from 'ui/doc_title/doc_title';

import { showSaveModal, SaveResult } from 'ui/saved_objects/show_saved_object_save_modal';

import { showShareContextMenu, ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';

import { timefilter } from 'ui/timefilter';

import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing/get_unhashable_states_provider';

import {
  AppStateClass as TAppStateClass,
  AppState as TAppState,
} from 'ui/state_management/app_state';

import { KbnUrl } from 'ui/url/kbn_url';
import { Filter } from '@kbn/es-query';
import { IndexPattern } from 'ui/index_patterns';
import { IPrivate } from 'ui/private';
import { Query, SavedQuery } from 'src/legacy/core_plugins/data/public';
import { SaveOptions } from 'ui/saved_objects/saved_object';
import { capabilities } from 'ui/capabilities';
import { Subscription } from 'rxjs';
import { npStart } from 'ui/new_platform';
import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';
import { data } from '../../../data/public/setup';

import {
  DashboardContainer,
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerFactory,
  DashboardContainerInput,
  DashboardPanelState,
} from '../../../dashboard_embeddable_container/public/np_ready/public';
import {
  isErrorEmbeddable,
  ErrorEmbeddable,
  ViewMode,
  openAddPanelFlyout,
} from '../../../embeddable_api/public/np_ready/public';
import { start } from '../../../embeddable_api/public/np_ready/public/legacy';
import { DashboardAppState, NavAction, ConfirmModalFn, SavedDashboardPanel } from './types';

import { showOptionsPopover } from './top_nav/show_options_popover';
import { DashboardSaveModal } from './top_nav/save_modal';
import { showCloneModal } from './top_nav/show_clone_modal';
import { saveDashboard } from './lib';
import { DashboardStateManager } from './dashboard_state_manager';
import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { TopNavIds } from './top_nav/top_nav_ids';
import { getDashboardTitle } from './dashboard_strings';
import { DashboardAppScope } from './dashboard_app';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../visualize/embeddable';
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';

const { savedQueryService } = data.search.services;

export class DashboardAppController {
  // Part of the exposed plugin API - do not remove without careful consideration.
  appStatus: {
    dirty: boolean;
  };

  constructor({
    $scope,
    $route,
    $routeParams,
    getAppState,
    dashboardConfig,
    localStorage,
    Private,
    kbnUrl,
    AppStateClass,
    indexPatterns,
    config,
    confirmModal,
    courier,
  }: {
    courier: { fetch: () => void };
    $scope: DashboardAppScope;
    $route: any;
    $routeParams: any;
    getAppState: {
      previouslyStored: () => TAppState | undefined;
    };
    indexPatterns: {
      getDefault: () => Promise<IndexPattern>;
    };
    dashboardConfig: any;
    localStorage: {
      get: (prop: string) => unknown;
    };
    Private: IPrivate;
    kbnUrl: KbnUrl;
    AppStateClass: TAppStateClass<DashboardAppState>;
    config: any;
    confirmModal: ConfirmModalFn;
  }) {
    const queryFilter = Private(FilterBarQueryFilterProvider);
    const getUnhashableStates = Private(getUnhashableStatesProvider);
    const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);

    let lastReloadRequestTime = 0;

    const dash = ($scope.dash = $route.current.locals.dash);
    if (dash.id) {
      docTitle.change(dash.title);
    }

    const dashboardStateManager = new DashboardStateManager({
      savedDashboard: dash,
      AppStateClass,
      hideWriteControls: dashboardConfig.getHideWriteControls(),
    });

    $scope.appState = dashboardStateManager.getAppState();

    // The 'previouslyStored' check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (dashboardStateManager.getIsTimeSavedWithDashboard() && !getAppState.previouslyStored()) {
      dashboardStateManager.syncTimefilterWithDashboard(timefilter);
    }
    $scope.showSaveQuery = capabilities.get().dashboard.saveQuery as boolean;

    const updateIndexPatterns = (container?: DashboardContainer) => {
      if (!container || isErrorEmbeddable(container)) {
        return;
      }

      let panelIndexPatterns: IndexPattern[] = [];
      Object.values(container.getChildIds()).forEach(id => {
        const embeddable = container.getChild(id);
        if (isErrorEmbeddable(embeddable)) return;
        const embeddableIndexPatterns = (embeddable.getOutput() as any).indexPatterns;
        if (!embeddableIndexPatterns) return;
        panelIndexPatterns.push(...embeddableIndexPatterns);
      });
      panelIndexPatterns = uniq(panelIndexPatterns, 'id');

      if (panelIndexPatterns && panelIndexPatterns.length > 0) {
        $scope.$evalAsync(() => {
          $scope.indexPatterns = panelIndexPatterns;
        });
      } else {
        indexPatterns.getDefault().then(defaultIndexPattern => {
          $scope.$evalAsync(() => {
            $scope.indexPatterns = [defaultIndexPattern];
          });
        });
      }
    };

    const getDashboardInput = (): DashboardContainerInput => {
      const embeddablesMap: {
        [key: string]: DashboardPanelState;
      } = {};
      dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
        embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(
          panel,
          dashboardStateManager.getUseMargins()
        );
      });
      let expandedPanelId;
      if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
        expandedPanelId = dashboardContainer.getInput().expandedPanelId;
      }
      return {
        id: dashboardStateManager.savedDashboard.id || '',
        filters: queryFilter.getFilters(),
        hidePanelTitles: dashboardStateManager.getHidePanelTitles(),
        query: $scope.model.query,
        timeRange: {
          ..._.cloneDeep(timefilter.getTime()),
        },
        refreshConfig: timefilter.getRefreshInterval(),
        viewMode: dashboardStateManager.getViewMode(),
        panels: embeddablesMap,
        isFullScreenMode: dashboardStateManager.getFullScreenMode(),
        useMargins: dashboardStateManager.getUseMargins(),
        lastReloadRequestTime,
        title: dashboardStateManager.getTitle(),
        description: dashboardStateManager.getDescription(),
        expandedPanelId,
      };
    };

    const updateState = () => {
      // Following the "best practice" of always have a '.' in your ng-models –
      // https://github.com/angular/angular.js/wiki/Understanding-Scopes
      $scope.model = {
        query: dashboardStateManager.getQuery(),
        filters: queryFilter.getFilters(),
        timeRestore: dashboardStateManager.getTimeRestore(),
        title: dashboardStateManager.getTitle(),
        description: dashboardStateManager.getDescription(),
        timeRange: timefilter.getTime(),
        refreshInterval: timefilter.getRefreshInterval(),
      };
      $scope.panels = dashboardStateManager.getPanels();
      $scope.screenTitle = dashboardStateManager.getTitle();
    };

    updateState();

    let dashboardContainer: DashboardContainer | undefined;
    let inputSubscription: Subscription | undefined;
    let outputSubscription: Subscription | undefined;

    const dashboardDom = document.getElementById('dashboardViewport');
    const dashboardFactory = start.getEmbeddableFactory(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;
    dashboardFactory
      .create(getDashboardInput())
      .then((container: DashboardContainer | ErrorEmbeddable) => {
        if (!isErrorEmbeddable(container)) {
          dashboardContainer = container;

          updateIndexPatterns(dashboardContainer);

          outputSubscription = dashboardContainer.getOutput$().subscribe(() => {
            updateIndexPatterns(dashboardContainer);
          });

          inputSubscription = dashboardContainer.getInput$().subscribe(async () => {
            let dirty = false;

            // This has to be first because handleDashboardContainerChanges causes
            // appState.save which will cause refreshDashboardContainer to be called.

            // Add filters modifies the object passed to it, hence the clone deep.
            if (!_.isEqual(container.getInput().filters, queryFilter.getFilters())) {
              await queryFilter.addFilters(_.cloneDeep(container.getInput().filters));

              dashboardStateManager.applyFilters($scope.model.query, container.getInput().filters);
              dirty = true;
            }

            $scope.$evalAsync(() => {
              dashboardStateManager.handleDashboardContainerChanges(container);
              if (dirty) {
                updateState();
              }
            });
          });

          dashboardStateManager.registerChangeListener(() => {
            // we aren't checking dirty state because there are changes the container needs to know about
            // that won't make the dashboard "dirty" - like a view mode change.
            refreshDashboardContainer();
          });

          // This code needs to be replaced with a better mechanism for adding new embeddables of
          // any type from the add panel. Likely this will happen via creating a visualization "inline",
          // without navigating away from the UX.
          if ($routeParams[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
            container.addSavedObjectEmbeddable(
              VISUALIZE_EMBEDDABLE_TYPE,
              $routeParams[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]
            );
            kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
            kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
          }
        }

        if (dashboardDom) {
          container.render(dashboardDom);
        }
      });

    // Part of the exposed plugin API - do not remove without careful consideration.
    this.appStatus = {
      dirty: !dash.id,
    };

    dashboardStateManager.registerChangeListener(status => {
      this.appStatus.dirty = status.dirty || !dash.id;
      updateState();
    });

    dashboardStateManager.applyFilters(
      dashboardStateManager.getQuery() || {
        query: '',
        language:
          localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
      },
      queryFilter.getFilters()
    );

    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();

    const landingPageUrl = () => `#${DashboardConstants.LANDING_PAGE_PATH}`;

    const getDashTitle = () =>
      getDashboardTitle(
        dashboardStateManager.getTitle(),
        dashboardStateManager.getViewMode(),
        dashboardStateManager.getIsDirty(timefilter)
      );

    // Push breadcrumbs to new header navigation
    const updateBreadcrumbs = () => {
      chrome.breadcrumbs.set([
        {
          text: i18n.translate('kbn.dashboard.dashboardAppBreadcrumbsTitle', {
            defaultMessage: 'Dashboard',
          }),
          href: landingPageUrl(),
        },
        { text: getDashTitle() },
      ]);
    };

    updateBreadcrumbs();
    dashboardStateManager.registerChangeListener(updateBreadcrumbs);

    $scope.getShouldShowEditHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsEditMode() &&
      !dashboardConfig.getHideWriteControls();
    $scope.getShouldShowViewHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsViewMode() &&
      !dashboardConfig.getHideWriteControls();

    const getChangesFromAppStateForContainerState = () => {
      const appStateDashboardInput = getDashboardInput();
      if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
        return appStateDashboardInput;
      }

      const containerInput = dashboardContainer.getInput();
      const differences: Partial<DashboardContainerInput> = {};
      Object.keys(containerInput).forEach(key => {
        const containerValue = (containerInput as { [key: string]: unknown })[key];
        const appStateValue = ((appStateDashboardInput as unknown) as { [key: string]: unknown })[
          key
        ];
        if (!_.isEqual(containerValue, appStateValue)) {
          (differences as { [key: string]: unknown })[key] = appStateValue;
        }
      });

      return Object.values(differences).length === 0 ? undefined : differences;
    };

    const refreshDashboardContainer = () => {
      const changes = getChangesFromAppStateForContainerState();
      if (changes && dashboardContainer) {
        dashboardContainer.updateInput(changes);
      }
    };

    $scope.updateQueryAndFetch = function({ query, dateRange }) {
      if (dateRange) {
        timefilter.setTime(dateRange);
      }

      const oldQuery = $scope.model.query;
      if (_.isEqual(oldQuery, query)) {
        // The user can still request a reload in the query bar, even if the
        // query is the same, and in that case, we have to explicitly ask for
        // a reload, since no state changes will cause it.
        lastReloadRequestTime = new Date().getTime();
        refreshDashboardContainer();
      } else {
        $scope.model.query = query;
        dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
      }
    };

    $scope.onRefreshChange = function({ isPaused, refreshInterval }) {
      timefilter.setRefreshInterval({
        pause: isPaused,
        value: refreshInterval ? refreshInterval : $scope.model.refreshInterval.value,
      });
    };

    $scope.onFiltersUpdated = filters => {
      // The filters will automatically be set when the queryFilter emits an update event (see below)
      queryFilter.setFilters(filters);
    };

    $scope.onCancelApplyFilters = () => {
      $scope.appState.$newFilters = [];
    };

    $scope.onApplyFilters = filters => {
      queryFilter.addFiltersAndChangeTimeFilter(filters);
      $scope.appState.$newFilters = [];
    };

    $scope.onQuerySaved = savedQuery => {
      $scope.savedQuery = savedQuery;
    };

    $scope.onSavedQueryUpdated = savedQuery => {
      $scope.savedQuery = { ...savedQuery };
    };

    $scope.onClearSavedQuery = () => {
      delete $scope.savedQuery;
      dashboardStateManager.setSavedQueryId(undefined);
      queryFilter.removeAll();
      dashboardStateManager.applyFilters(
        {
          query: '',
          language:
            localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
        },
        []
      );
    };

    const updateStateFromSavedQuery = (savedQuery: SavedQuery) => {
      queryFilter.setFilters(savedQuery.attributes.filters || []);
      dashboardStateManager.applyFilters(
        savedQuery.attributes.query,
        savedQuery.attributes.filters || []
      );
      if (savedQuery.attributes.timefilter) {
        timefilter.setTime({
          from: savedQuery.attributes.timefilter.from,
          to: savedQuery.attributes.timefilter.to,
        });
        if (savedQuery.attributes.timefilter.refreshInterval) {
          timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
        }
      }
    };

    $scope.$watch('savedQuery', (newSavedQuery: SavedQuery) => {
      if (!newSavedQuery) return;
      dashboardStateManager.setSavedQueryId(newSavedQuery.id);

      updateStateFromSavedQuery(newSavedQuery);
    });

    $scope.$watch(
      () => {
        return dashboardStateManager.getSavedQueryId();
      },
      newSavedQueryId => {
        if (!newSavedQueryId) {
          $scope.savedQuery = undefined;
          return;
        }
        if ($scope.savedQuery && newSavedQueryId !== $scope.savedQuery.id) {
          savedQueryService.getSavedQuery(newSavedQueryId).then((savedQuery: SavedQuery) => {
            $scope.$evalAsync(() => {
              $scope.savedQuery = savedQuery;
              updateStateFromSavedQuery(savedQuery);
            });
          });
        }
      }
    );

    $scope.$watch('appState.$newFilters', (filters: Filter[] = []) => {
      if (filters.length === 1) {
        $scope.onApplyFilters(filters);
      }
    });

    $scope.indexPatterns = [];

    $scope.$watch('model.query', (newQuery: Query) => {
      const query = migrateLegacyQuery(newQuery) as Query;
      $scope.updateQueryAndFetch({ query });
    });

    $scope.$watch(
      () => capabilities.get().dashboard.saveQuery,
      newCapability => {
        $scope.showSaveQuery = newCapability as boolean;
      }
    );

    $scope.timefilterSubscriptions$ = new Subscription();

    $scope.timefilterSubscriptions$.add(
      subscribeWithScope($scope, timefilter.getRefreshIntervalUpdate$(), {
        next: () => {
          updateState();
          refreshDashboardContainer();
        },
      })
    );

    $scope.timefilterSubscriptions$.add(
      subscribeWithScope($scope, timefilter.getTimeUpdate$(), {
        next: () => {
          updateState();
          refreshDashboardContainer();
        },
      })
    );

    function updateViewMode(newMode: ViewMode) {
      $scope.topNavMenu = getTopNavConfig(
        newMode,
        navActions,
        dashboardConfig.getHideWriteControls()
      ); // eslint-disable-line no-use-before-define
      dashboardStateManager.switchViewMode(newMode);
    }

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
        kbnUrl.change(
          dash.id ? createDashboardEditUrl(dash.id) : DashboardConstants.CREATE_NEW_DASHBOARD_URL
        );
        // This is only necessary for new dashboards, which will default to Edit mode.
        updateViewMode(ViewMode.VIEW);

        // We need to do a hard reset of the timepicker. appState will not reload like
        // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
        // reload will cause it not to sync.
        if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
          dashboardStateManager.syncTimefilterWithDashboard(timefilter);
        }
      }

      confirmModal(
        i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesDescription', {
          defaultMessage: `Once you discard your changes, there's no getting them back.`,
        }),
        {
          onConfirm: revertChangesAndExitEditMode,
          onCancel: _.noop,
          confirmButtonText: i18n.translate(
            'kbn.dashboard.changeViewModeConfirmModal.confirmButtonLabel',
            { defaultMessage: 'Discard changes' }
          ),
          cancelButtonText: i18n.translate(
            'kbn.dashboard.changeViewModeConfirmModal.cancelButtonLabel',
            { defaultMessage: 'Continue editing' }
          ),
          defaultFocusedButton: ConfirmationButtonTypes.CANCEL,
          title: i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesTitle', {
            defaultMessage: 'Discard changes to dashboard?',
          }),
        }
      );
    };

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
    function save(saveOptions: SaveOptions): Promise<SaveResult> {
      return saveDashboard(angular.toJson, timefilter, dashboardStateManager, saveOptions)
        .then(function(id) {
          if (id) {
            toastNotifications.addSuccess({
              title: i18n.translate('kbn.dashboard.dashboardWasSavedSuccessMessage', {
                defaultMessage: `Dashboard '{dashTitle}' was saved`,
                values: { dashTitle: dash.title },
              }),
              'data-test-subj': 'saveDashboardSuccess',
            });

            if (dash.id !== $routeParams.id) {
              kbnUrl.change(createDashboardEditUrl(dash.id));
            } else {
              docTitle.change(dash.lastSavedTitle);
              updateViewMode(ViewMode.VIEW);
            }
          }
          return { id };
        })
        .catch(error => {
          toastNotifications.addDanger({
            title: i18n.translate('kbn.dashboard.dashboardWasNotSavedDangerMessage', {
              defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
              values: {
                dashTitle: dash.title,
                errorMessage: error.message,
              },
            }),
            'data-test-subj': 'saveDashboardFailure',
          });
          return { error };
        });
    }

    $scope.showFilterBar = () =>
      $scope.model.filters.length > 0 || !dashboardStateManager.getFullScreenMode();

    $scope.showAddPanel = () => {
      dashboardStateManager.setFullScreenMode(false);
      /*
       * Temp solution for triggering menu click.
       * When de-angularizing this code, please call the underlaying action function
       * directly and not via the top nav object.
       **/
      navActions[TopNavIds.ADD]();
    };
    $scope.enterEditMode = () => {
      dashboardStateManager.setFullScreenMode(false);
      /*
       * Temp solution for triggering menu click.
       * When de-angularizing this code, please call the underlaying action function
       * directly and not via the top nav object.
       **/
      navActions[TopNavIds.ENTER_EDIT_MODE]();
    };
    const navActions: {
      [key: string]: NavAction;
    } = {};
    navActions[TopNavIds.FULL_SCREEN] = () => dashboardStateManager.setFullScreenMode(true);
    navActions[TopNavIds.EXIT_EDIT_MODE] = () => onChangeViewMode(ViewMode.VIEW);
    navActions[TopNavIds.ENTER_EDIT_MODE] = () => onChangeViewMode(ViewMode.EDIT);
    navActions[TopNavIds.SAVE] = () => {
      const currentTitle = dashboardStateManager.getTitle();
      const currentDescription = dashboardStateManager.getDescription();
      const currentTimeRestore = dashboardStateManager.getTimeRestore();
      const onSave = ({
        newTitle,
        newDescription,
        newCopyOnSave,
        newTimeRestore,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      }: {
        newTitle: string;
        newDescription: string;
        newCopyOnSave: boolean;
        newTimeRestore: boolean;
        isTitleDuplicateConfirmed: boolean;
        onTitleDuplicate: () => void;
      }) => {
        dashboardStateManager.setTitle(newTitle);
        dashboardStateManager.setDescription(newDescription);
        dashboardStateManager.savedDashboard.copyOnSave = newCopyOnSave;
        dashboardStateManager.setTimeRestore(newTimeRestore);
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
          timeRestore={currentTimeRestore}
          showCopyOnSave={dash.id ? true : false}
        />
      );
      showSaveModal(dashboardSaveModal);
    };
    navActions[TopNavIds.CLONE] = () => {
      const currentTitle = dashboardStateManager.getTitle();
      const onClone = (
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
    };
    navActions[TopNavIds.ADD] = () => {
      if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
        openAddPanelFlyout({
          embeddable: dashboardContainer,
          getAllFactories: start.getEmbeddableFactories,
          getFactory: start.getEmbeddableFactory,
          notifications: npStart.core.notifications,
          overlays: npStart.core.overlays,
          SavedObjectFinder,
        });
      }
    };

    navActions[TopNavIds.OPTIONS] = anchorElement => {
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
    };
    navActions[TopNavIds.SHARE] = anchorElement => {
      showShareContextMenu({
        anchorElement,
        allowEmbed: true,
        allowShortUrl: !dashboardConfig.getHideWriteControls(),
        getUnhashableStates,
        objectId: dash.id,
        objectType: 'dashboard',
        shareContextMenuExtensions: shareContextMenuExtensions.raw,
        sharingData: {
          title: dash.title,
        },
        isDirty: dashboardStateManager.getIsDirty(),
      });
    };

    updateViewMode(dashboardStateManager.getViewMode());

    // update root source when filters update
    const updateSubscription = queryFilter.getUpdates$().subscribe({
      next: () => {
        $scope.model.filters = queryFilter.getFilters();
        dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
        if (dashboardContainer) {
          dashboardContainer.updateInput({ filters: $scope.model.filters });
        }
      },
    });

    $scope.$on('$destroy', () => {
      updateSubscription.unsubscribe();
      $scope.timefilterSubscriptions$.unsubscribe();

      dashboardStateManager.destroy();
      if (inputSubscription) {
        inputSubscription.unsubscribe();
      }
      if (outputSubscription) {
        outputSubscription.unsubscribe();
      }
      if (dashboardContainer) {
        dashboardContainer.destroy();
      }
    });
  }
}
