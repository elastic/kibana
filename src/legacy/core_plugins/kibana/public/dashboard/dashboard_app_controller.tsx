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
import angular from 'angular';
import _ from 'lodash';
import React from 'react';
// @ts-ignore
import rison from 'rison-node';
import chrome from 'ui/chrome';
import { IndexPattern } from 'ui/index_patterns';
import { toastNotifications } from 'ui/notify';

import 'ui/apply_filters';
import 'ui/listen';
import 'ui/search_bar';

import { i18n } from '@kbn/i18n';

import {
  embeddableFactories,
  ErrorEmbeddable,
  Filter,
  ViewMode,
} from 'plugins/embeddable_api/index';

// @ts-ignore
import { DocTitleProvider } from 'ui/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
// @ts-ignore
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
// @ts-ignore
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
// @ts-ignore
import { ShareContextMenuExtensionsRegistryProvider, showShareContextMenu } from 'ui/share';
// @ts-ignore
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';

import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
  DashboardContainerFactory,
  DashboardContainerInput,
  DashboardPanelState,
} from 'plugins/dashboard_embeddable/index';

import { isErrorEmbeddable } from 'plugins/dashboard_embeddable/index';
import { AddPanelAction } from 'plugins/embeddable_api/index';
import { IPrivate } from 'ui/private';
import { AppState } from 'ui/state_management/app_state';
import { timefilter } from 'ui/timefilter';
import { TimeRange } from 'ui/timefilter/time_history';
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
import { Query } from 'ui/visualize';
import { QueryLanguageType } from 'ui/visualize/loader/types';
import { TopNavIds } from './top_nav/top_nav_ids';
import { showOptionsPopover } from './top_nav/show_options_popover';
// @ts-ignore
import { showCloneModal } from './top_nav/show_clone_modal';
// @ts-ignore
import { DashboardSaveModal } from './top_nav/save_modal';
// @ts-ignore
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { saveDashboard } from './lib';
import { getDashboardTitle } from './dashboard_strings';
import { createDashboardEditUrl, DashboardConstants } from './dashboard_constants';
import { DashboardStateManager } from './dashboard_state_manager';
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';
import { SavedObjectDashboard } from './saved_dashboard/saved_dashboard';
import { SavedDashboardPanel } from './types';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../visualize/embeddable';

interface DashboardAppScope extends ng.IScope {
  dash: SavedObjectDashboard;
  appState: AppState;
  screenTitle: string;
  model: {
    query: Query;
    filters: Filter[];
    timeRestore: boolean;
    title: string;
    description: string;
    timeRange: TimeRange;
    refreshInterval: any;
  };
  panels: SavedDashboardPanel[];
  indexPatterns: IndexPattern[];
  $evalAsync: any;
  dashboardViewMode: ViewMode;
  lastReloadRequestTime: number;
  expandedPanel?: string;
  getShouldShowEditHelp: () => boolean;
  getShouldShowViewHelp: () => boolean;
  updateQueryAndFetch: ({ query, dateRange }: { query: Query; dateRange?: TimeRange }) => void;
  onRefreshChange: (
    { isPaused, refreshInterval }: { isPaused: boolean; refreshInterval: any }
  ) => void;
  onFiltersUpdated: (filters: Filter[]) => void;
  $listenAndDigestAsync: any;
  onCancelApplyFilters: () => void;
  onApplyFilters: (filters: Filter[]) => void;
  topNavMenu: any;
  showFilterBar: () => boolean;
  showAddPanel: any;
  kbnTopNav: any;
  enterEditMode: () => void;
  $listen: any;
}

export class DashboardAppController {
  private appStatus: { dirty: boolean };
  private $scope: DashboardAppScope;
  private dashboardStateManager: DashboardStateManager;
  private savedDashboardId: string;
  private routeParams: {
    [key: string]: string;
  };
  private navActions: {
    [key: string]: (menuItem: any, navController: any, anchorElement: any) => void;
  } = {};
  private kbnUrl: {
    change: (url: string) => void;
    removeParam: (param: string) => void;
  };
  private confirmModal: (
    message: string,
    confirmOptions: {
      onConfirm: () => void;
      onCancel: () => void;
      confirmButtonText: string;
      cancelButtonText: string;
      defaultFocusedButton: string;
      title: string;
    }
  ) => void;
  private hideWriteControls: boolean;
  private indexPatterns: {
    getDefault: () => Promise<IndexPattern>;
  };
  private docTitle: { change: (title: string) => void };
  private queryFilter: {
    setFilters: (filters: Filter[]) => void;
    getFilters: () => Filter[];
    addFilters: (filters: Filter[]) => void;
    addFiltersAndChangeTimeFilter: (filters: Filter[]) => void;
  };
  private dashboardContainer: DashboardContainer | undefined | ErrorEmbeddable;
  private Private: IPrivate;
  private unsubscribe?: () => void;

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
    addFilter,
  }: {
    $scope: DashboardAppScope;
    $route: any;
    $routeParams: any;
    getAppState: {
      previouslyStored: () => AppState | undefined;
    };
    indexPatterns: {
      getDefault: () => Promise<IndexPattern>;
    };
    dashboardConfig: any;
    localStorage: any;
    Private: IPrivate;
    kbnUrl: {
      change: (url: string) => void;
      removeParam: (param: string) => void;
    };
    AppStateClass: any;
    config: any;
    confirmModal: (
      message: string,
      confirmOptions: {
        onConfirm: () => void;
        onCancel: () => void;
        confirmButtonText: string;
        cancelButtonText: string;
        defaultFocusedButton: string;
        title: string;
      }
    ) => void;
    addFilter: (
      {
        field,
        value,
        operator,
        index,
      }: {
        field: string;
        value: string;
        operator: string;
        index: string;
      },
      appState: AppState
    ) => void;
  }) {
    this.hideWriteControls = dashboardConfig.getHideWriteControls();
    this.confirmModal = confirmModal;
    this.$scope = $scope;
    this.kbnUrl = kbnUrl;
    this.indexPatterns = indexPatterns;
    this.Private = Private;

    this.queryFilter = Private(FilterBarQueryFilterProvider);
    this.docTitle = Private<{ change: (title: string) => void }>(DocTitleProvider);

    this.savedDashboardId = $routeParams.id;
    this.routeParams = $route.current.params;
    const dash = ($scope.dash = $route.current.locals.dash);
    if (dash.id) {
      this.docTitle.change(dash.title);
    }

    this.dashboardStateManager = new DashboardStateManager({
      savedDashboard: dash,
      AppStateClass,
      hideWriteControls: this.hideWriteControls,
      addFilter: ({
        field,
        value,
        operator,
        index,
      }: {
        field: string;
        value: string;
        operator: string;
        index: string;
      }) => {
        addFilter(
          {
            field,
            value,
            operator,
            index,
          },
          this.dashboardStateManager.getAppState()
        );
      },
    });

    // This is for actions to dynamically merge extra filters.
    const addFilters = $route.current.params.addFilters;
    if (addFilters) {
      const filtersParsed = rison.decode(addFilters);
      this.queryFilter.addFilters(filtersParsed);
    }

    $scope.appState = this.dashboardStateManager.getAppState();

    // The 'previouslyStored' check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (
      this.dashboardStateManager.getIsTimeSavedWithDashboard() &&
      !getAppState.previouslyStored()
    ) {
      this.dashboardStateManager.syncTimefilterWithDashboard(timefilter);
    }

    // Part of the exposed plugin API - do not remove without careful consideration.
    this.appStatus = {
      dirty: !dash.id,
    };

    this.dashboardStateManager.registerChangeListener((status: { dirty: boolean }) => {
      this.appStatus.dirty = status.dirty || !dash.id;
      this.updateState();
    });

    this.dashboardStateManager.applyFilters(
      this.dashboardStateManager.getQuery() || {
        query: '',
        language:
          localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
      },
      this.queryFilter.getFilters()
    );

    timefilter.disableTimeRangeSelector();
    timefilter.disableAutoRefreshSelector();

    this.updateState();
    this.initializeDashboardContainer();

    this.updateBreadcrumbs();
    this.dashboardStateManager.registerChangeListener(() => this.updateBreadcrumbs());

    this.initializeTopNavActions();
    $scope.getShouldShowEditHelp = () =>
      !this.dashboardStateManager.getPanels().length &&
      this.dashboardStateManager.getIsEditMode() &&
      !dashboardConfig.getHideWriteControls();
    $scope.getShouldShowViewHelp = () =>
      !this.dashboardStateManager.getPanels().length &&
      this.dashboardStateManager.getIsViewMode() &&
      !dashboardConfig.getHideWriteControls();

    $scope.updateQueryAndFetch = ({ query, dateRange }) => {
      timefilter.setTime(dateRange);

      const oldQuery = $scope.model.query;
      if (_.isEqual(oldQuery, query)) {
        // The user can still request a reload in the query bar, even if the
        // query is the same, and in that case, we have to explicitly ask for
        // a reload, since no state changes will cause it.
        $scope.lastReloadRequestTime = new Date().getTime();
        this.refreshDashboardContainer();
      } else {
        $scope.model.query = query;
        // dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
      }
    };

    $scope.onRefreshChange = ({ isPaused, refreshInterval }) => {
      timefilter.setRefreshInterval({
        pause: isPaused,
        value: refreshInterval ? refreshInterval : $scope.model.refreshInterval.value,
      });
    };

    $scope.onFiltersUpdated = filters => {
      // The filters will automatically be set when the queryFilter emits an update event (see below)
      this.queryFilter.setFilters(filters);
    };

    $scope.onCancelApplyFilters = () => {
      $scope.appState.$newFilters = [];
    };

    $scope.onApplyFilters = filters => {
      this.queryFilter.addFiltersAndChangeTimeFilter(filters);
      $scope.appState.$newFilters = [];
    };

    $scope.$watch('appState.$newFilters', (filters: Filter[] = []) => {
      if (filters.length === 1) {
        $scope.onApplyFilters(filters);
      }
    });

    this.$scope.indexPatterns = [];

    $scope.$watch('model.query', (newQuery: Query) => {
      const query = migrateLegacyQuery(newQuery);
      $scope.updateQueryAndFetch({ query });
    });

    $scope.$listenAndDigestAsync(timefilter, 'refreshIntervalUpdate', () => {
      this.updateState();
      this.refreshDashboardContainer();
    });

    $scope.$listenAndDigestAsync(timefilter, 'timeUpdate', () => {
      this.updateState();
      this.refreshDashboardContainer();
    });

    $scope.showFilterBar = () =>
      $scope.model.filters.length > 0 || !this.dashboardStateManager.getFullScreenMode();

    $scope.showAddPanel = () => {
      this.dashboardStateManager.setFullScreenMode(false);
      $scope.kbnTopNav.click(TopNavIds.ADD);
    };
    $scope.enterEditMode = () => {
      this.dashboardStateManager.setFullScreenMode(false);
      $scope.kbnTopNav.click('edit');
    };
    this.updateViewMode(this.dashboardStateManager.getViewMode());

    // update root source when filters update
    $scope.$listen(this.queryFilter, 'update', () => {
      $scope.model.filters = this.queryFilter.getFilters();
      this.dashboardStateManager.applyFilters($scope.model.query, $scope.model.filters);
    });

    $scope.$on('$destroy', () => {
      this.dashboardStateManager.destroy();
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    });
  }

  private updateViewMode(newMode: ViewMode) {
    this.$scope.topNavMenu = getTopNavConfig(newMode, this.navActions, this.hideWriteControls);
    this.dashboardStateManager.switchViewMode(newMode);
  }

  private updateBreadcrumbs() {
    chrome.breadcrumbs.set([
      {
        text: i18n.translate('kbn.dashboard.dashboardAppBreadcrumbsTitle', {
          defaultMessage: 'Dashboard',
        }),
        href: `#${DashboardConstants.LANDING_PAGE_PATH}`,
      },
      {
        text: getDashboardTitle(
          this.dashboardStateManager.getTitle(),
          this.dashboardStateManager.getViewMode(),
          this.dashboardStateManager.getIsDirty(timefilter)
        ),
      },
    ]);
  }

  private initializeTopNavActions() {
    this.navActions = {};
    this.navActions[TopNavIds.FULL_SCREEN] = () =>
      this.dashboardStateManager.setFullScreenMode(true);
    this.navActions[TopNavIds.EXIT_EDIT_MODE] = () => this.onChangeViewMode(ViewMode.VIEW);
    this.navActions[TopNavIds.ENTER_EDIT_MODE] = () => this.onChangeViewMode(ViewMode.EDIT);
    this.navActions[TopNavIds.SAVE] = () => this.onInitiateSaveAction();
    this.navActions[TopNavIds.CLONE] = () => this.onCloneDashboard();

    this.navActions[TopNavIds.ADD] = () => {
      if (this.dashboardContainer && !isErrorEmbeddable(this.dashboardContainer)) {
        new AddPanelAction().execute({ embeddable: this.dashboardContainer });
      }
    };

    this.navActions[TopNavIds.OPTIONS] = (menuItem, navController, anchorElement) => {
      showOptionsPopover({
        anchorElement,
        useMargins: this.dashboardStateManager.getUseMargins(),
        onUseMarginsChange: (isChecked: boolean) => {
          this.dashboardStateManager.setUseMargins(isChecked);
        },
        hidePanelTitles: this.dashboardStateManager.getHidePanelTitles(),
        onHidePanelTitlesChange: (isChecked: boolean) => {
          this.dashboardStateManager.setHidePanelTitles(isChecked);
        },
      });
    };

    this.navActions[TopNavIds.SHARE] = (menuItem, navController, anchorElement) => {
      const getUnhashableStates = this.Private(getUnhashableStatesProvider);
      const shareContextMenuExtensions = this.Private(ShareContextMenuExtensionsRegistryProvider);
      showShareContextMenu({
        anchorElement,
        allowEmbed: true,
        getUnhashableStates,
        objectId: this.dashboardStateManager.savedDashboard.id,
        objectType: 'dashboard',
        shareContextMenuExtensions,
        allowShortUrl: !this.hideWriteControls,
        sharingData: {
          title: this.dashboardStateManager.savedDashboard.title,
        },
        isDirty: this.dashboardStateManager.getIsDirty(),
      });
    };
  }

  private onSaveDashboard(saveOptions: any) {
    return saveDashboard(angular.toJson, timefilter, this.dashboardStateManager, saveOptions)
      .then((id: string) => {
        if (id) {
          toastNotifications.addSuccess({
            title: i18n.translate('kbn.dashboard.dashboardWasSavedSuccessMessage', {
              defaultMessage: `Dashboard '{dashTitle}' was saved`,
              values: { dashTitle: this.dashboardStateManager.savedDashboard.title },
            }),
            'data-test-subj': 'saveDashboardSuccess',
          });
          if (
            this.dashboardStateManager.savedDashboard.id &&
            this.dashboardStateManager.savedDashboard.id !== this.savedDashboardId
          ) {
            this.kbnUrl.change(
              createDashboardEditUrl(this.dashboardStateManager.savedDashboard.id)
            );
          } else {
            this.docTitle.change(this.dashboardStateManager.savedDashboard.lastSavedTitle);
            this.updateViewMode(ViewMode.VIEW);
          }
        }
        return { id };
      })
      .catch((error: { message: string }) => {
        toastNotifications.addDanger({
          title: i18n.translate('kbn.dashboard.dashboardWasNotSavedDangerMessage', {
            defaultMessage: `Dashboard '{dashTitle}' was not saved. Error: {errorMessage}`,
            values: {
              dashTitle: this.dashboardStateManager.savedDashboard.title,
              errorMessage: error.message,
            },
          }),
          'data-test-subj': 'saveDashboardFailure',
        });
        return { error };
      });
  }

  private onCloneDashboard() {
    const currentTitle = this.dashboardStateManager.getTitle();
    const onClone = (
      newTitle: string,
      isTitleDuplicateConfirmed: boolean,
      onTitleDuplicate: boolean
    ) => {
      this.dashboardStateManager.savedDashboard.copyOnSave = true;
      this.dashboardStateManager.setTitle(newTitle);
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };
      return this.onSaveDashboard(saveOptions).then(
        ({ id, error }: { id?: string; error?: { message: string } }) => {
          // If the save wasn't successful, put the original title back.
          if (!id || error) {
            this.dashboardStateManager.setTitle(currentTitle);
          }
          return { id, error };
        }
      );
    };

    showCloneModal(onClone, currentTitle);
  }

  private getChangesFromAppStateForContainerState() {
    const appStateDashboardInput = this.getDashboardInput();
    if (!this.dashboardContainer || isErrorEmbeddable(this.dashboardContainer)) {
      return appStateDashboardInput;
    }

    const containerInput = this.dashboardContainer.getInput();
    const differences: Partial<DashboardContainerInput> = {};
    Object.keys(containerInput).forEach(key => {
      const containerValue = (containerInput as { [key: string]: unknown })[key];
      const appStateValue = (appStateDashboardInput as { [key: string]: unknown })[key];
      if (!_.isEqual(containerValue, appStateValue)) {
        (differences as { [key: string]: unknown })[key] = appStateValue;
      }
    });

    return Object.values(differences).length === 0 ? undefined : differences;
  }

  private refreshDashboardContainer() {
    const changes = this.getChangesFromAppStateForContainerState();
    if (changes && this.dashboardContainer) {
      console.log('refreshDashboardContainer: changes are: ', changes);
      this.dashboardContainer.updateInput(changes);
    }
  }

  private getDashboardInput(): DashboardContainerInput {
    const embeddablesMap: {
      [key: string]: DashboardPanelState;
    } = {};
    this.dashboardStateManager.getPanels().forEach((panel: SavedDashboardPanel) => {
      embeddablesMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
    });
    let expandedPanelId;
    if (this.dashboardContainer && !isErrorEmbeddable(this.dashboardContainer)) {
      expandedPanelId = this.dashboardContainer.getInput().expandedPanelId;
    }
    return {
      id: this.dashboardStateManager.savedDashboard.id || '',
      filters: this.$scope.model.filters,
      hidePanelTitles: this.dashboardStateManager.getHidePanelTitles(),
      query: this.$scope.model.query,
      timeRange: {
        from: timefilter.getTime().from,
        to: timefilter.getTime().to,
      },
      refreshConfig: timefilter.getRefreshInterval(),
      viewMode: this.dashboardStateManager.getViewMode(),
      panels: embeddablesMap,
      isFullScreenMode: this.dashboardStateManager.getFullScreenMode(),
      useMargins: this.dashboardStateManager.getUseMargins(),
      lastReloadRequestTime: this.$scope.lastReloadRequestTime,
      title: this.dashboardStateManager.getTitle(),
      description: this.dashboardStateManager.getDescription(),
      expandedPanelId,
    };
  }

  private initializeDashboardContainer() {
    const dashboardDom = document.getElementById('dashboardViewport');
    const dashboardFactory = embeddableFactories.getFactoryByName<DashboardContainerFactory>(
      DASHBOARD_CONTAINER_TYPE
    );
    dashboardFactory
      .create(this.getDashboardInput())
      .then((container: DashboardContainer | ErrorEmbeddable) => {
        if (!isErrorEmbeddable(container)) {
          this.dashboardContainer = container;

          this.updateIndexPatterns();
          const subscription = this.dashboardContainer.getInput$().subscribe(async input => {
            // This has to be first because handleDashboardContainerChanges cuases
            // appState.save which will cause refreshDashboardContainer to be called.
            await this.queryFilter.addFilters(container.getInput().filters);

            this.$scope.model.filters = container.getInput().filters;
            if (!_.isEqual(this.queryFilter.getFilters(), container.getInput().filters)) {
              console.log('diff');
              // throw new Error('no!');
            }

            this.dashboardStateManager.applyFilters(
              this.$scope.model.query,
              container.getInput().filters
            );

            this.updateIndexPatterns();

            this.$scope.$evalAsync(() => {
              this.dashboardStateManager.handleDashboardContainerChanges(container);
              const appChanges = this.getChangesFromAppStateForContainerState();
              if (appChanges !== undefined) {
                throw new Error('Changes should be null');
              }
            });
          });
          this.unsubscribe = subscription.unsubscribe;
          this.dashboardStateManager.registerChangeListener(() => this.refreshDashboardContainer());

          if (this.routeParams[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
            container.addNewEmbeddable(VISUALIZE_EMBEDDABLE_TYPE, {
              savedObjectId: this.routeParams[DashboardConstants.NEW_VISUALIZATION_ID_PARAM],
            });
            this.kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
            this.kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
          }
        }

        container.render(dashboardDom);
      });
  }

  private updateIndexPatterns() {
    const container = this.dashboardContainer;
    if (!container || isErrorEmbeddable(container)) {
      return;
    }
    const panelIndexPatterns = container.getPanelIndexPatterns();
    if (panelIndexPatterns && panelIndexPatterns.length > 0) {
      this.$scope.$evalAsync(() => {
        this.$scope.indexPatterns = panelIndexPatterns;
      });
    } else {
      this.indexPatterns.getDefault().then(defaultIndexPattern => {
        this.$scope.$evalAsync(() => {
          this.$scope.indexPatterns = [defaultIndexPattern];
        });
      });
    }
  }

  private async onInitiateSaveAction() {
    const currentTitle = this.dashboardStateManager.getTitle();
    const currentDescription = this.dashboardStateManager.getDescription();
    const currentTimeRestore = this.dashboardStateManager.getTimeRestore();
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
      this.dashboardStateManager.setTitle(newTitle);
      this.dashboardStateManager.setDescription(newDescription);
      this.dashboardStateManager.savedDashboard.copyOnSave = newCopyOnSave;
      this.dashboardStateManager.setTimeRestore(newTimeRestore);
      const saveOptions = {
        confirmOverwrite: false,
        isTitleDuplicateConfirmed,
        onTitleDuplicate,
      };
      return this.onSaveDashboard(saveOptions).then(
        ({ id, error }: { id?: string; error?: { message: string } }) => {
          // If the save wasn't successful, put the original values back.
          if (!id || error) {
            this.dashboardStateManager.setTitle(currentTitle);
            this.dashboardStateManager.setDescription(currentDescription);
            this.dashboardStateManager.setTimeRestore(currentTimeRestore);
          }
          return { id, error };
        }
      );
    };

    const dashboardSaveModal = (
      <DashboardSaveModal
        onSave={onSave}
        onClose={() => {
          return;
        }}
        title={currentTitle}
        description={currentDescription}
        timeRestore={currentTimeRestore}
        showCopyOnSave={this.dashboardStateManager.savedDashboard.id ? true : false}
      />
    );
    showSaveModal(dashboardSaveModal);
  }

  private async updateState() {
    // Following the "best practice" of always have a '.' in your ng-models –
    // https://github.com/angular/angular.js/wiki/Understanding-Scopes
    this.$scope.model = {
      query: this.dashboardStateManager.getQuery(),
      filters: this.queryFilter.getFilters(),
      timeRestore: this.dashboardStateManager.getTimeRestore(),
      title: this.dashboardStateManager.getTitle(),
      description: this.dashboardStateManager.getDescription(),
      timeRange: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
    };

    // Hack for drilldown links to add query.  TODO: remove after demo. Not to be included in phase 1
    const staticQuery = this.routeParams.staticQuery;
    if (staticQuery) {
      this.$scope.model.query = { query: staticQuery, language: QueryLanguageType.KUERY };
      if (this.$scope.appState) {
        this.$scope.appState.query = { query: staticQuery, language: QueryLanguageType.KUERY };
      }
      this.kbnUrl.removeParam('staticQuery');
    }

    this.$scope.panels = this.dashboardStateManager.getPanels();
    this.$scope.screenTitle = this.dashboardStateManager.getTitle();
  }

  private onChangeViewMode(newMode: ViewMode) {
    const isPageRefresh = newMode === this.dashboardStateManager.getViewMode();
    const isLeavingEditMode = !isPageRefresh && newMode === ViewMode.VIEW;
    const willLoseChanges = isLeavingEditMode && this.dashboardStateManager.getIsDirty(timefilter);

    if (!willLoseChanges) {
      this.updateViewMode(newMode);
      return;
    }

    const revertChangesAndExitEditMode = () => {
      this.dashboardStateManager.resetState();
      this.kbnUrl.change(
        this.dashboardStateManager.savedDashboard.id
          ? createDashboardEditUrl(this.dashboardStateManager.savedDashboard.id)
          : DashboardConstants.CREATE_NEW_DASHBOARD_URL
      );
      // This is only necessary for new dashboards, which will default to Edit mode.
      this.updateViewMode(ViewMode.VIEW);

      // We need to do a hard reset of the timepicker. appState will not reload like
      // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
      // reload will cause it not to sync.
      if (this.dashboardStateManager.getIsTimeSavedWithDashboard()) {
        this.dashboardStateManager.syncTimefilterWithDashboard(timefilter);
      }
    };

    this.confirmModal(
      i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesDescription', {
        defaultMessage: `Once you discard your changes, there's no getting them back.`,
      }),
      {
        onConfirm: revertChangesAndExitEditMode,
        onCancel: _.noop,
        confirmButtonText: i18n.translate(
          'kbn.dashboard.changeViewModeConfirmModal.confirmButtonLabel',
          {
            defaultMessage: 'Discard changes',
          }
        ),
        cancelButtonText: i18n.translate(
          'kbn.dashboard.changeViewModeConfirmModal.cancelButtonLabel',
          {
            defaultMessage: 'Continue editing',
          }
        ),
        defaultFocusedButton: ConfirmationButtonTypes.CANCEL,
        title: i18n.translate('kbn.dashboard.changeViewModeConfirmModal.discardChangesTitle', {
          defaultMessage: 'Discard changes to dashboard?',
        }),
      }
    );
  }
}
