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

import _, { uniq } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EUI_MODAL_CANCEL_BUTTON } from '@elastic/eui';
import React from 'react';
import angular from 'angular';

import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { History } from 'history';
import { DashboardEmptyScreen, DashboardEmptyScreenProps } from './dashboard_empty_screen';

import { migrateLegacyQuery, SavedObjectSaveOpts, subscribeWithScope } from '../legacy_imports';
import {
  esFilters,
  IndexPattern,
  IndexPatternsContract,
  Query,
  SavedQuery,
  syncAppFilters,
  syncQuery,
} from '../../../../../../plugins/data/public';
import {
  SaveResult,
  showSaveModal,
  getSavedObjectFinder,
} from '../../../../../../plugins/saved_objects/public';

import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
  DashboardContainerFactory,
  DashboardContainerInput,
  DashboardPanelState,
} from '../../../../dashboard_embeddable_container/public/np_ready/public';
import {
  EmbeddableFactoryNotFoundError,
  ErrorEmbeddable,
  isErrorEmbeddable,
  openAddPanelFlyout,
  ViewMode,
} from '../../../../embeddable_api/public/np_ready/public';
import { NavAction, SavedDashboardPanel } from './types';

import { showOptionsPopover } from './top_nav/show_options_popover';
import { DashboardSaveModal } from './top_nav/save_modal';
import { showCloneModal } from './top_nav/show_clone_modal';
import { saveDashboard } from './lib';
import { DashboardStateManager } from './dashboard_state_manager';
import { createDashboardEditUrl, DashboardConstants } from './dashboard_constants';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { TopNavIds } from './top_nav/top_nav_ids';
import { getDashboardTitle } from './dashboard_strings';
import { DashboardAppScope } from './dashboard_app';
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';
import { RenderDeps } from './application';
import {
  IKbnUrlStateStorage,
  removeQueryParam,
  unhashUrl,
} from '../../../../../../plugins/kibana_utils/public';
import { KibanaLegacyStart } from '../../../../../../plugins/kibana_legacy/public';

export interface DashboardAppControllerDependencies extends RenderDeps {
  $scope: DashboardAppScope;
  $route: any;
  $routeParams: any;
  indexPatterns: IndexPatternsContract;
  dashboardConfig: KibanaLegacyStart['dashboardConfig'];
  history: History;
  kbnUrlStateStorage: IKbnUrlStateStorage;
}

export class DashboardAppController {
  // Part of the exposed plugin API - do not remove without careful consideration.
  appStatus: {
    dirty: boolean;
  };

  constructor({
    pluginInitializerContext,
    $scope,
    $route,
    $routeParams,
    dashboardConfig,
    localStorage,
    indexPatterns,
    savedQueryService,
    embeddable,
    share,
    dashboardCapabilities,
    data: { query: queryService },
    core: {
      notifications,
      overlays,
      chrome,
      injectedMetadata,
      uiSettings,
      savedObjects,
      http,
      i18n: i18nStart,
    },
    history,
    kbnUrlStateStorage,
  }: DashboardAppControllerDependencies) {
    const filterManager = queryService.filterManager;
    const queryFilter = filterManager;
    const timefilter = queryService.timefilter.timefilter;

    // starts syncing `_g` portion of url with query services
    // note: dashboard_state_manager.ts syncs `_a` portion of url
    const {
      stop: stopSyncingGlobalStateWithUrl,
      hasInheritedQueryFromUrl: hasInheritedGlobalStateFromUrl,
    } = syncQuery(queryService, kbnUrlStateStorage);

    let lastReloadRequestTime = 0;

    const dash = ($scope.dash = $route.current.locals.dash);
    if (dash.id) {
      chrome.docTitle.change(dash.title);
    }

    const dashboardStateManager = new DashboardStateManager({
      savedDashboard: dash,
      hideWriteControls: dashboardConfig.getHideWriteControls(),
      kibanaVersion: pluginInitializerContext.env.packageInfo.version,
      kbnUrlStateStorage,
      history,
    });

    const stopSyncingAppFilters = syncAppFilters(filterManager, {
      set: filters => dashboardStateManager.setFilters(filters),
      get: () => dashboardStateManager.appState.filters,
      state$: dashboardStateManager.appState$.pipe(map(state => state.filters)),
    });

    // The hash check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (dashboardStateManager.getIsTimeSavedWithDashboard() && !hasInheritedGlobalStateFromUrl) {
      dashboardStateManager.syncTimefilterWithDashboard(timefilter);
    }
    $scope.showSaveQuery = dashboardCapabilities.saveQuery as boolean;

    const getShouldShowEditHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsEditMode() &&
      !dashboardConfig.getHideWriteControls();

    const getShouldShowViewHelp = () =>
      !dashboardStateManager.getPanels().length &&
      dashboardStateManager.getIsViewMode() &&
      !dashboardConfig.getHideWriteControls();

    const getIsEmptyInReadonlyMode = () =>
      !dashboardStateManager.getPanels().length &&
      !getShouldShowEditHelp() &&
      !getShouldShowViewHelp() &&
      dashboardConfig.getHideWriteControls();

    const addVisualization = () => {
      navActions[TopNavIds.VISUALIZE]();
    };

    const updateIndexPatterns = (container?: DashboardContainer) => {
      if (!container || isErrorEmbeddable(container)) {
        return;
      }

      let panelIndexPatterns: IndexPattern[] = [];
      Object.values(container.getChildIds()).forEach(id => {
        const embeddableInstance = container.getChild(id);
        if (isErrorEmbeddable(embeddableInstance)) return;
        const embeddableIndexPatterns = (embeddableInstance.getOutput() as any).indexPatterns;
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
            $scope.indexPatterns = [defaultIndexPattern as IndexPattern];
          });
        });
      }
    };

    const getEmptyScreenProps = (
      shouldShowEditHelp: boolean,
      isEmptyInReadOnlyMode: boolean
    ): DashboardEmptyScreenProps => {
      const emptyScreenProps: DashboardEmptyScreenProps = {
        onLinkClick: shouldShowEditHelp ? $scope.showAddPanel : $scope.enterEditMode,
        showLinkToVisualize: shouldShowEditHelp,
        uiSettings,
        http,
      };
      if (shouldShowEditHelp) {
        emptyScreenProps.onVisualizeClick = addVisualization;
      }
      if (isEmptyInReadOnlyMode) {
        emptyScreenProps.isReadonlyMode = true;
      }
      return emptyScreenProps;
    };

    const getDashboardInput = (): DashboardContainerInput => {
      const embeddablesMap: {
        [key: string]: DashboardPanelState;
      } = {};
      dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
        embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
      });
      let expandedPanelId;
      if (dashboardContainer && !isErrorEmbeddable(dashboardContainer)) {
        expandedPanelId = dashboardContainer.getInput().expandedPanelId;
      }
      const shouldShowEditHelp = getShouldShowEditHelp();
      const shouldShowViewHelp = getShouldShowViewHelp();
      const isEmptyInReadonlyMode = getIsEmptyInReadonlyMode();
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
        isEmptyState: shouldShowEditHelp || shouldShowViewHelp || isEmptyInReadonlyMode,
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
    const dashboardFactory = embeddable.getEmbeddableFactory(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;
    dashboardFactory
      .create(getDashboardInput())
      .then((container: DashboardContainer | ErrorEmbeddable) => {
        if (!isErrorEmbeddable(container)) {
          dashboardContainer = container;

          dashboardContainer.renderEmpty = () => {
            const shouldShowEditHelp = getShouldShowEditHelp();
            const shouldShowViewHelp = getShouldShowViewHelp();
            const isEmptyInReadOnlyMode = getIsEmptyInReadonlyMode();
            const isEmptyState = shouldShowEditHelp || shouldShowViewHelp || isEmptyInReadOnlyMode;
            return isEmptyState ? (
              <DashboardEmptyScreen
                {...getEmptyScreenProps(shouldShowEditHelp, isEmptyInReadOnlyMode)}
              />
            ) : null;
          };

          updateIndexPatterns(dashboardContainer);

          outputSubscription = dashboardContainer.getOutput$().subscribe(() => {
            updateIndexPatterns(dashboardContainer);
          });

          inputSubscription = dashboardContainer.getInput$().subscribe(() => {
            let dirty = false;

            // This has to be first because handleDashboardContainerChanges causes
            // appState.save which will cause refreshDashboardContainer to be called.

            if (
              !esFilters.compareFilters(
                container.getInput().filters,
                queryFilter.getFilters(),
                esFilters.COMPARE_ALL_OPTIONS
              )
            ) {
              // Add filters modifies the object passed to it, hence the clone deep.
              queryFilter.addFilters(_.cloneDeep(container.getInput().filters));

              dashboardStateManager.applyFilters($scope.model.query, container.getInput().filters);
              dirty = true;
            }

            dashboardStateManager.handleDashboardContainerChanges(container);
            $scope.$evalAsync(() => {
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
          if ($routeParams[DashboardConstants.ADD_EMBEDDABLE_TYPE]) {
            const type = $routeParams[DashboardConstants.ADD_EMBEDDABLE_TYPE];
            const id = $routeParams[DashboardConstants.ADD_EMBEDDABLE_ID];
            container.addSavedObjectEmbeddable(type, id);
            removeQueryParam(history, DashboardConstants.ADD_EMBEDDABLE_TYPE);
            removeQueryParam(history, DashboardConstants.ADD_EMBEDDABLE_ID);
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
          localStorage.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
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
        dashboardStateManager.getIsDirty(timefilter),
        dashboardStateManager.isNew()
      );

    // Push breadcrumbs to new header navigation
    const updateBreadcrumbs = () => {
      chrome.setBreadcrumbs([
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

    const getChangesFromAppStateForContainerState = () => {
      const appStateDashboardInput = getDashboardInput();
      if (!dashboardContainer || isErrorEmbeddable(dashboardContainer)) {
        return appStateDashboardInput;
      }

      const containerInput = dashboardContainer.getInput();
      const differences: Partial<DashboardContainerInput> = {};

      // Filters shouldn't  be compared using regular isEqual
      if (
        !esFilters.compareFilters(
          containerInput.filters,
          appStateDashboardInput.filters,
          esFilters.COMPARE_ALL_OPTIONS
        )
      ) {
        differences.filters = appStateDashboardInput.filters;
      }

      Object.keys(_.omit(containerInput, 'filters')).forEach(key => {
        const containerValue = (containerInput as { [key: string]: unknown })[key];
        const appStateValue = ((appStateDashboardInput as unknown) as { [key: string]: unknown })[
          key
        ];
        if (!_.isEqual(containerValue, appStateValue)) {
          (differences as { [key: string]: unknown })[key] = appStateValue;
        }
      });

      // cloneDeep hack is needed, as there are multiple place, where container's input mutated,
      // but values from appStateValue are deeply frozen, as they can't be mutated directly
      return Object.values(differences).length === 0 ? undefined : _.cloneDeep(differences);
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

    $scope.onQuerySaved = savedQuery => {
      $scope.savedQuery = savedQuery;
    };

    $scope.onSavedQueryUpdated = savedQuery => {
      $scope.savedQuery = { ...savedQuery };
    };

    $scope.onClearSavedQuery = () => {
      delete $scope.savedQuery;
      dashboardStateManager.setSavedQueryId(undefined);
      dashboardStateManager.applyFilters(
        {
          query: '',
          language:
            localStorage.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
        },
        queryFilter.getGlobalFilters()
      );
      // Making this method sync broke the updates.
      // Temporary fix, until we fix the complex state in this file.
      setTimeout(() => {
        queryFilter.setFilters(queryFilter.getGlobalFilters());
      }, 0);
    };

    const updateStateFromSavedQuery = (savedQuery: SavedQuery) => {
      const savedQueryFilters = savedQuery.attributes.filters || [];
      const globalFilters = queryFilter.getGlobalFilters();
      const allFilters = [...globalFilters, ...savedQueryFilters];

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
      // Making this method sync broke the updates.
      // Temporary fix, until we fix the complex state in this file.
      setTimeout(() => {
        queryFilter.setFilters(allFilters);
      }, 0);
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
        if (!$scope.savedQuery || newSavedQueryId !== $scope.savedQuery.id) {
          savedQueryService.getSavedQuery(newSavedQueryId).then((savedQuery: SavedQuery) => {
            $scope.$evalAsync(() => {
              $scope.savedQuery = savedQuery;
              updateStateFromSavedQuery(savedQuery);
            });
          });
        }
      }
    );

    $scope.indexPatterns = [];

    $scope.$watch('model.query', (newQuery: Query) => {
      const query = migrateLegacyQuery(newQuery) as Query;
      $scope.updateQueryAndFetch({ query });
    });

    $scope.$watch(
      () => dashboardCapabilities.saveQuery,
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
        // This is only necessary for new dashboards, which will default to Edit mode.
        updateViewMode(ViewMode.VIEW);

        // Angular's $location skips this update because of history updates from syncState which happen simultaneously
        // when calling kbnUrl.change() angular schedules url update and when angular finally starts to process it,
        // the update is considered outdated and angular skips it
        // so have to use implementation of dashboardStateManager.changeDashboardUrl, which workarounds those issues
        dashboardStateManager.changeDashboardUrl(
          dash.id ? createDashboardEditUrl(dash.id) : DashboardConstants.CREATE_NEW_DASHBOARD_URL
        );

        // We need to do a hard reset of the timepicker. appState will not reload like
        // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
        // reload will cause it not to sync.
        if (dashboardStateManager.getIsTimeSavedWithDashboard()) {
          // have to use $evalAsync here until '_g' is migrated from $location to state sync utility ('history')
          // When state sync utility changes url, angular's $location is missing it's own updates which happen during the same digest cycle
          // temporary solution is to delay $location updates to next digest cycle
          // unfortunately, these causes 2 browser history entries, but this is temporary and will be fixed after migrating '_g' to state_sync utilities
          $scope.$evalAsync(() => {
            dashboardStateManager.syncTimefilterWithDashboard(timefilter);
          });
        }
      }

      overlays
        .openConfirm(
          i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesDescription', {
            defaultMessage: `Once you discard your changes, there's no getting them back.`,
          }),
          {
            confirmButtonText: i18n.translate(
              'kbn.dashboard.changeViewModeConfirmModal.confirmButtonLabel',
              { defaultMessage: 'Discard changes' }
            ),
            cancelButtonText: i18n.translate(
              'kbn.dashboard.changeViewModeConfirmModal.cancelButtonLabel',
              { defaultMessage: 'Continue editing' }
            ),
            defaultFocusedButton: EUI_MODAL_CANCEL_BUTTON,
            title: i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesTitle', {
              defaultMessage: 'Discard changes to dashboard?',
            }),
          }
        )
        .then(isConfirmed => {
          if (isConfirmed) {
            revertChangesAndExitEditMode();
          }
        });
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
    function save(saveOptions: SavedObjectSaveOpts): Promise<SaveResult> {
      return saveDashboard(angular.toJson, timefilter, dashboardStateManager, saveOptions)
        .then(function(id) {
          if (id) {
            notifications.toasts.addSuccess({
              title: i18n.translate('kbn.dashboard.dashboardWasSavedSuccessMessage', {
                defaultMessage: `Dashboard '{dashTitle}' was saved`,
                values: { dashTitle: dash.title },
              }),
              'data-test-subj': 'saveDashboardSuccess',
            });

            if (dash.id !== $routeParams.id) {
              // Angular's $location skips this update because of history updates from syncState which happen simultaneously
              // when calling kbnUrl.change() angular schedules url update and when angular finally starts to process it,
              // the update is considered outdated and angular skips it
              // so have to use implementation of dashboardStateManager.changeDashboardUrl, which workarounds those issues
              dashboardStateManager.changeDashboardUrl(createDashboardEditUrl(dash.id));
            } else {
              chrome.docTitle.change(dash.lastSavedTitle);
              updateViewMode(ViewMode.VIEW);
            }
          }
          return { id };
        })
        .catch(error => {
          notifications.toasts.addDanger({
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
      showSaveModal(dashboardSaveModal, i18nStart.Context);
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
          getAllFactories: embeddable.getEmbeddableFactories,
          getFactory: embeddable.getEmbeddableFactory,
          notifications,
          overlays,
          SavedObjectFinder: getSavedObjectFinder(savedObjects, uiSettings),
        });
      }
    };

    navActions[TopNavIds.VISUALIZE] = async () => {
      const type = 'visualization';
      const factory = embeddable.getEmbeddableFactory(type);
      if (!factory) {
        throw new EmbeddableFactoryNotFoundError(type);
      }
      const explicitInput = await factory.getExplicitInput();
      if (dashboardContainer) {
        await dashboardContainer.addNewEmbeddable(type, explicitInput);
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
      share.toggleShareContextMenu({
        anchorElement,
        allowEmbed: true,
        allowShortUrl: !dashboardConfig.getHideWriteControls(),
        shareableUrl: unhashUrl(window.location.href),
        objectId: dash.id,
        objectType: 'dashboard',
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

    const visibleSubscription = chrome.getIsVisible$().subscribe(isVisible => {
      $scope.$evalAsync(() => {
        $scope.isVisible = isVisible;
      });
    });

    dashboardStateManager.registerChangeListener(() => {
      // view mode could have changed, so trigger top nav update
      $scope.topNavMenu = getTopNavConfig(
        dashboardStateManager.getViewMode(),
        navActions,
        dashboardConfig.getHideWriteControls()
      );
    });

    $scope.$on('$destroy', () => {
      updateSubscription.unsubscribe();
      stopSyncingGlobalStateWithUrl();
      stopSyncingAppFilters();
      visibleSubscription.unsubscribe();
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
