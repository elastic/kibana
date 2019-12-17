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

import { Subscription } from 'rxjs';
import { DashboardEmptyScreen, DashboardEmptyScreenProps } from './dashboard_empty_screen';

import {
  subscribeWithScope,
  ConfirmationButtonTypes,
  showSaveModal,
  SaveResult,
  migrateLegacyQuery,
  State,
  AppStateClass as TAppStateClass,
  KbnUrl,
  SavedObjectSaveOpts,
  unhashUrl,
  VISUALIZE_EMBEDDABLE_TYPE,
  LENS_EMBEDDABLE_TYPE,
} from '../legacy_imports';
import { FilterStateManager } from '../../../../data/public';
import {
  IndexPattern,
  Query,
  SavedQuery,
  IndexPatternsContract,
} from '../../../../../../plugins/data/public';

import {
  DashboardContainer,
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerFactory,
  DashboardContainerInput,
  DashboardPanelState,
} from '../../../../dashboard_embeddable_container/public/np_ready/public';
import {
  isErrorEmbeddable,
  ErrorEmbeddable,
  ViewMode,
  openAddPanelFlyout,
  EmbeddableFactoryNotFoundError,
} from '../../../../embeddable_api/public/np_ready/public';
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
import { convertSavedDashboardPanelToPanelState } from './lib/embeddable_saved_object_converters';
import { RenderDeps } from './application';
import {
  SavedObjectFinderProps,
  SavedObjectFinderUi,
} from '../../../../../../plugins/kibana_react/public';

export interface DashboardAppControllerDependencies extends RenderDeps {
  $scope: DashboardAppScope;
  $route: any;
  $routeParams: any;
  getAppState: any;
  globalState: State;
  indexPatterns: IndexPatternsContract;
  dashboardConfig: any;
  kbnUrl: KbnUrl;
  AppStateClass: TAppStateClass<DashboardAppState>;
  config: any;
  confirmModal: ConfirmModalFn;
}

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
    globalState,
    dashboardConfig,
    localStorage,
    kbnUrl,
    AppStateClass,
    indexPatterns,
    config,
    confirmModal,
    savedQueryService,
    embeddables,
    share,
    dashboardCapabilities,
    npDataStart: {
      query: {
        filterManager,
        timefilter: { timefilter },
      },
    },
    core: { notifications, overlays, chrome, injectedMetadata, uiSettings, savedObjects, http },
  }: DashboardAppControllerDependencies) {
    new FilterStateManager(globalState, getAppState, filterManager);
    const queryFilter = filterManager;

    let lastReloadRequestTime = 0;

    const dash = ($scope.dash = $route.current.locals.dash);
    if (dash.id) {
      chrome.docTitle.change(dash.title);
    }

    const dashboardStateManager = new DashboardStateManager({
      savedDashboard: dash,
      AppStateClass,
      hideWriteControls: dashboardConfig.getHideWriteControls(),
      kibanaVersion: injectedMetadata.getKibanaVersion(),
    });

    $scope.appState = dashboardStateManager.getAppState();

    // The hash check is so we only update the time filter on dashboard open, not during
    // normal cross app navigation.
    if (dashboardStateManager.getIsTimeSavedWithDashboard() && !globalState.$inheritedGlobalState) {
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
    const dashboardFactory = embeddables.getEmbeddableFactory(
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

            // Add filters modifies the object passed to it, hence the clone deep.
            if (!_.isEqual(container.getInput().filters, queryFilter.getFilters())) {
              queryFilter.addFilters(_.cloneDeep(container.getInput().filters));

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
          if ($routeParams[DashboardConstants.EMBEDDABLE_TYPE]) {
            const type = $routeParams[DashboardConstants.EMBEDDABLE_TYPE];
            const id = $routeParams[DashboardConstants.EMBEDDABLE_ID];
            container.addSavedObjectEmbeddable(type, id);
            kbnUrl.removeParam(DashboardConstants.EMBEDDABLE_TYPE);
            kbnUrl.removeParam(DashboardConstants.EMBEDDABLE_ID);
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
            localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
        },
        []
      );
      // Making this method sync broke the updates.
      // Temporary fix, until we fix the complex state in this file.
      setTimeout(queryFilter.removeAll, 0);
    };

    const updateStateFromSavedQuery = (savedQuery: SavedQuery) => {
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
      // Making this method sync broke the updates.
      // Temporary fix, until we fix the complex state in this file.
      setTimeout(() => {
        queryFilter.setFilters(savedQuery.attributes.filters || []);
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
              kbnUrl.change(createDashboardEditUrl(dash.id));
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
        const SavedObjectFinder = (props: SavedObjectFinderProps) => (
          <SavedObjectFinderUi {...props} savedObjects={savedObjects} uiSettings={uiSettings} />
        );

        openAddPanelFlyout({
          embeddable: dashboardContainer,
          getAllFactories: embeddables.getEmbeddableFactories,
          getFactory: embeddables.getEmbeddableFactory,
          notifications,
          overlays,
          SavedObjectFinder,
        });
      }
    };

    navActions[TopNavIds.VISUALIZE] = async () => {
      const type = 'visualization';
      const factory = embeddables.getEmbeddableFactory(type);
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

    $scope.$on('$destroy', () => {
      updateSubscription.unsubscribe();
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
