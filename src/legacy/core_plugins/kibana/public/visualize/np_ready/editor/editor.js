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
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { makeStateful, useVisualizeAppState } from './lib';
import { VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { addHelpMenuToAppChrome } from '../help_menu/help_menu_util';
import { unhashUrl } from '../../../../../../../plugins/kibana_utils/public';
import { kbnBaseUrl } from '../../../../../../../plugins/kibana_legacy/public';
import {
  SavedObjectSaveModal,
  showSaveModal,
} from '../../../../../../../plugins/saved_objects/public';
import {
  esFilters,
  connectToQueryState,
  syncQueryStateWithUrl,
} from '../../../../../../../plugins/data/public';

import { initVisEditorDirective } from './visualization_editor';
import { initVisualizationDirective } from './visualization';
import {
  VISUALIZE_EMBEDDABLE_TYPE,
  subscribeWithScope,
  absoluteToParsedUrl,
  KibanaParsedUrl,
  migrateLegacyQuery,
  DashboardConstants,
} from '../../legacy_imports';

import { getServices } from '../../kibana_services';

export function initEditorDirective(app, deps) {
  app.directive('visualizeApp', function() {
    return {
      restrict: 'E',
      controllerAs: 'visualizeApp',
      controller: VisualizeAppController,
    };
  });

  initVisEditorDirective(app, deps);
  initVisualizationDirective(app, deps);
}

function VisualizeAppController(
  $scope,
  $route,
  $window,
  $injector,
  $timeout,
  kbnUrl,
  redirectWhenMissing,
  kbnUrlStateStorage,
  history
) {
  const {
    indexPatterns,
    localStorage,
    visualizeCapabilities,
    share,
    data: { query: queryService },
    toastNotifications,
    chrome,
    getBasePath,
    core: { docLinks },
    savedQueryService,
    uiSettings,
    I18nContext,
    setActiveUrl,
  } = getServices();

  const {
    filterManager,
    timefilter: { timefilter },
  } = queryService;

  // starts syncing `_g` portion of url with query services
  const { stop: stopSyncingQueryServiceStateWithUrl } = syncQueryStateWithUrl(
    queryService,
    kbnUrlStateStorage
  );

  // Retrieve the resolved SavedVis instance.
  const savedVis = $route.current.locals.savedVis;
  const _applyVis = () => {
    $scope.$apply();
  };
  // This will trigger a digest cycle. This is needed when vis is updated from a global angular like in visualize_embeddable.js.
  savedVis.vis.on('apply', _applyVis);
  // vis is instance of src/legacy/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const { vis, searchSource, savedSearch } = savedVis;

  $scope.vis = vis;

  const $appStatus = {
    dirty: !savedVis.id,
  };

  vis.on('dirtyStateChange', ({ isDirty }) => {
    vis.dirty = isDirty;
    $scope.$digest();
  });

  $scope.topNavMenu = [
    ...(visualizeCapabilities.save
      ? [
          {
            id: 'save',
            label: i18n.translate('kbn.topNavMenu.saveVisualizationButtonLabel', {
              defaultMessage: 'save',
            }),
            description: i18n.translate(
              'kbn.visualize.topNavMenu.saveVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Save Visualization',
              }
            ),
            testId: 'visualizeSaveButton',
            disableButton() {
              return Boolean(vis.dirty);
            },
            tooltip() {
              if (vis.dirty) {
                return i18n.translate(
                  'kbn.visualize.topNavMenu.saveVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before saving',
                  }
                );
              }
            },
            run: async () => {
              const onSave = ({
                newTitle,
                newCopyOnSave,
                isTitleDuplicateConfirmed,
                onTitleDuplicate,
                newDescription,
              }) => {
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                savedVis.copyOnSave = newCopyOnSave;
                savedVis.description = newDescription;
                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                };
                return doSave(saveOptions).then(response => {
                  // If the save wasn't successful, put the original values back.
                  if (!response.id || response.error) {
                    savedVis.title = currentTitle;
                  }
                  return response;
                });
              };

              const confirmButtonLabel = $scope.isAddToDashMode() ? (
                <FormattedMessage
                  id="kbn.visualize.saveDialog.saveAndAddToDashboardButtonLabel"
                  defaultMessage="Save and add to dashboard"
                />
              ) : null;

              const saveModal = (
                <SavedObjectSaveModal
                  onSave={onSave}
                  onClose={() => {}}
                  title={savedVis.title}
                  showCopyOnSave={savedVis.id ? true : false}
                  objectType="visualization"
                  confirmButtonLabel={confirmButtonLabel}
                  description={savedVis.description}
                  showDescription={true}
                />
              );
              showSaveModal(saveModal, I18nContext);
            },
          },
        ]
      : []),
    {
      id: 'share',
      label: i18n.translate('kbn.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('kbn.visualize.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: anchorElement => {
        const hasUnappliedChanges = vis.dirty;
        const hasUnsavedChanges = $appStatus.dirty;
        share.toggleShareContextMenu({
          anchorElement,
          allowEmbed: true,
          allowShortUrl: visualizeCapabilities.createShortUrl,
          shareableUrl: unhashUrl(window.location.href),
          objectId: savedVis.id,
          objectType: 'visualization',
          sharingData: {
            title: savedVis.title,
          },
          isDirty: hasUnappliedChanges || hasUnsavedChanges,
        });
      },
    },
    {
      id: 'inspector',
      label: i18n.translate('kbn.topNavMenu.openInspectorButtonLabel', {
        defaultMessage: 'inspect',
      }),
      description: i18n.translate('kbn.visualize.topNavMenu.openInspectorButtonAriaLabel', {
        defaultMessage: 'Open Inspector for visualization',
      }),
      testId: 'openInspectorButton',
      disableButton() {
        return !vis.hasInspector || !vis.hasInspector();
      },
      run() {
        const inspectorSession = vis.openInspector();
        // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
        const removeWatch = $scope.$on('$destroy', () => inspectorSession.close());
        // Remove that watch in case the user closes the inspector session herself.
        inspectorSession.onClose.finally(removeWatch);
      },
      tooltip() {
        if (!vis.hasInspector || !vis.hasInspector()) {
          return i18n.translate('kbn.visualize.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
    {
      id: 'refresh',
      label: i18n.translate('kbn.topNavMenu.refreshButtonLabel', { defaultMessage: 'refresh' }),
      description: i18n.translate('kbn.visualize.topNavMenu.refreshButtonAriaLabel', {
        defaultMessage: 'Refresh',
      }),
      run: function() {
        vis.forceReload();
      },
      testId: 'visualizeRefreshButton',
    },
  ];

  if (savedVis.id) {
    chrome.docTitle.change(savedVis.title);
  }

  const defaultQuery = {
    query: '',
    language:
      localStorage.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
  };

  // Extract visualization state with filtered aggs. You can see these filtered aggs in the URL.
  // Consists of things like aggs, params, listeners, title, type, etc.
  const savedVisState = vis.getState();
  const stateDefaults = {
    uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
    query: searchSource.getOwnField('query') || defaultQuery,
    filters: searchSource.getOwnField('filter') || [],
    vis: savedVisState,
    linked: !!savedVis.savedSearchId,
  };

  const { stateContainer, stopStateSync } = useVisualizeAppState({
    stateDefaults,
    kbnUrlStateStorage,
  });

  // sync initial app filters from state to filterManager
  filterManager.setAppFilters(_.cloneDeep(stateContainer.getState().filters));
  // setup syncing of app filters between appState and filterManager
  const stopSyncingAppFilters = connectToQueryState(
    queryService,
    {
      set: ({ filters }) => stateContainer.transitions.set('filters', filters),
      get: () => ({ filters: stateContainer.getState().filters }),
      state$: stateContainer.state$.pipe(map(state => ({ filters: state.filters }))),
    },
    {
      filters: esFilters.FilterStateStore.APP_STATE,
    }
  );

  // The savedVis is pulled from elasticsearch, but the appState is pulled from the url, with the
  // defaults applied. If the url was from a previous session which included modifications to the
  // appState then they won't be equal.
  if (!_.isEqual(stateContainer.getState().vis, stateDefaults.vis)) {
    try {
      vis.setState(stateContainer.getState().vis);
    } catch {
      redirectWhenMissing({
        'index-pattern-field': '/visualize',
      });
    }
  }

  $scope.filters = filterManager.getFilters();

  $scope.onFiltersUpdated = filters => {
    // The filters will automatically be set when the filterManager emits an update event (see below)
    filterManager.setFilters(filters);
  };

  $scope.showSaveQuery = visualizeCapabilities.saveQuery;

  $scope.$watch(
    () => visualizeCapabilities.saveQuery,
    newCapability => {
      $scope.showSaveQuery = newCapability;
    }
  );

  const updateSavedQueryFromUrl = savedQueryId => {
    if (!savedQueryId) {
      delete $scope.savedQuery;

      return;
    }

    if ($scope.savedQuery && $scope.savedQuery.id === savedQueryId) {
      return;
    }

    savedQueryService.getSavedQuery(savedQueryId).then(savedQuery => {
      $scope.$evalAsync(() => {
        $scope.updateSavedQuery(savedQuery);
      });
    });
  };

  function init() {
    if (vis.indexPattern) {
      $scope.indexPattern = vis.indexPattern;
    } else {
      indexPatterns.getDefault().then(defaultIndexPattern => {
        $scope.indexPattern = defaultIndexPattern;
      });
    }

    const initialState = stateContainer.getState();

    $scope.appState = {
      // mock implementation of the legacy appState.save()
      // this could be even replaced by passing only "updateAppState" callback
      save() {
        stateContainer.transitions.updateVisState(vis.getState());
      },
    };

    const handleLinkedSearch = linked => {
      if (linked && !savedVis.savedSearchId && savedSearch) {
        savedVis.savedSearchId = savedSearch.id;
        vis.savedSearchId = savedSearch.id;
        searchSource.setParent(savedSearch.searchSource);
      } else if (!linked && savedVis.savedSearchId) {
        delete savedVis.savedSearchId;
        delete vis.savedSearchId;
      }
    };

    // Create a PersistedState instance for uiState.
    const { persistedState, unsubscribePersisted, persistOnChange } = makeStateful(
      'uiState',
      stateContainer
    );
    $scope.uiState = persistedState;
    $scope.savedVis = savedVis;
    $scope.query = initialState.query;
    $scope.searchSource = searchSource;
    $scope.refreshInterval = timefilter.getRefreshInterval();
    handleLinkedSearch(initialState.linked);

    const addToDashMode =
      $route.current.params[DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM];
    kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);

    $scope.isAddToDashMode = () => addToDashMode;

    $scope.showFilterBar = () => {
      return vis.type.options.showFilterBar;
    };

    $scope.showQueryInput = () => {
      return vis.type.requiresSearch && vis.type.options.showQueryBar;
    };

    $scope.showQueryBarTimePicker = () => {
      // tsvb loads without an indexPattern initially (TODO investigate).
      // hide timefilter only if timeFieldName is explicitly undefined.
      const hasTimeField = vis.indexPattern ? !!vis.indexPattern.timeFieldName : true;
      return vis.type.options.showTimePicker && hasTimeField;
    };

    $scope.timeRange = timefilter.getTime();

    const unsubscribeStateUpdates = stateContainer.subscribe(state => {
      const newQuery = migrateLegacyQuery(state.query);
      if (!_.isEqual(state.query, newQuery)) {
        stateContainer.transitions.set('query', newQuery);
      }
      persistOnChange(state);
      updateSavedQueryFromUrl(state.savedQuery);

      // if the browser history was changed manually we need to reflect changes in the editor
      if (!_.isEqual(vis.getState(), state.vis)) {
        vis.setState(state.vis);
        vis.forceReload();
        vis.emit('updateEditor');
      }

      $appStatus.dirty = true;
      $scope.fetch();
    });

    const updateTimeRange = () => {
      $scope.timeRange = timefilter.getTime();
      $scope.$broadcast('render');
    };

    // update the query if savedQuery is stored
    updateSavedQueryFromUrl(initialState.savedQuery);

    const subscriptions = new Subscription();

    subscriptions.add(
      subscribeWithScope($scope, timefilter.getRefreshIntervalUpdate$(), {
        next: () => {
          $scope.refreshInterval = timefilter.getRefreshInterval();
        },
      })
    );
    subscriptions.add(
      subscribeWithScope($scope, timefilter.getTimeUpdate$(), {
        next: updateTimeRange,
      })
    );

    subscriptions.add(
      chrome.getIsVisible$().subscribe(isVisible => {
        $scope.$evalAsync(() => {
          $scope.isVisible = isVisible;
        });
      })
    );

    // update the searchSource when query updates
    $scope.fetch = function() {
      const { query, linked, filters } = stateContainer.getState();
      $scope.query = query;
      handleLinkedSearch(linked);
      savedVis.searchSource.setField('query', query);
      savedVis.searchSource.setField('filter', filters);
      $scope.$broadcast('render');
    };

    // update the searchSource when filters update
    subscriptions.add(
      subscribeWithScope($scope, filterManager.getUpdates$(), {
        next: () => {
          $scope.filters = filterManager.getFilters();
        },
      })
    );
    subscriptions.add(
      subscribeWithScope($scope, filterManager.getFetches$(), {
        next: $scope.fetch,
      })
    );

    $scope.$on('$destroy', () => {
      if ($scope._handler) {
        $scope._handler.destroy();
      }
      savedVis.destroy();
      subscriptions.unsubscribe();
      $scope.vis.off('apply', _applyVis);

      unsubscribePersisted();
      unsubscribeStateUpdates();
      stopStateSync();
      stopSyncingQueryServiceStateWithUrl();
      stopSyncingAppFilters();
    });

    $timeout(() => {
      $scope.$broadcast('render');
    });
  }

  $scope.updateQueryAndFetch = function({ query, dateRange }) {
    const isUpdate =
      (query && !_.isEqual(query, stateContainer.getState().query)) ||
      (dateRange && !_.isEqual(dateRange, $scope.timeRange));

    stateContainer.transitions.set('query', query);
    timefilter.setTime(dateRange);

    // If nothing has changed, trigger the fetch manually, otherwise it will happen as a result of the changes
    if (!isUpdate) {
      $scope.vis.forceReload();
    }
  };

  $scope.onRefreshChange = function({ isPaused, refreshInterval }) {
    timefilter.setRefreshInterval({
      pause: isPaused,
      value: refreshInterval ? refreshInterval : $scope.refreshInterval.value,
    });
  };

  $scope.onClearSavedQuery = () => {
    delete $scope.savedQuery;
    stateContainer.transitions.removeSavedQuery(defaultQuery);
    filterManager.setFilters(filterManager.getGlobalFilters());
  };

  const updateStateFromSavedQuery = savedQuery => {
    stateContainer.transitions.updateFromSavedQuery(savedQuery);

    const savedQueryFilters = savedQuery.attributes.filters || [];
    const globalFilters = filterManager.getGlobalFilters();
    filterManager.setFilters([...globalFilters, ...savedQueryFilters]);

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

  $scope.updateSavedQuery = savedQuery => {
    $scope.savedQuery = savedQuery;
    updateStateFromSavedQuery(savedQuery);
  };

  /**
   * Called when the user clicks "Save" button.
   */
  function doSave(saveOptions) {
    // vis.title was not bound and it's needed to reflect title into visState
    stateContainer.transitions.setVis({
      title: savedVis.title,
      type: savedVis.type || stateContainer.getState().vis.type,
    });
    savedVis.visState = stateContainer.getState().vis;
    savedVis.uiStateJSON = angular.toJson($scope.uiState.getChanges());
    $appStatus.dirty = false;

    return savedVis.save(saveOptions).then(
      function(id) {
        $scope.$evalAsync(() => {
          if (id) {
            toastNotifications.addSuccess({
              title: i18n.translate(
                'kbn.visualize.topNavMenu.saveVisualization.successNotificationText',
                {
                  defaultMessage: `Saved '{visTitle}'`,
                  values: {
                    visTitle: savedVis.title,
                  },
                }
              ),
              'data-test-subj': 'saveVisualizationSuccess',
            });

            if ($scope.isAddToDashMode()) {
              const savedVisualizationParsedUrl = new KibanaParsedUrl({
                basePath: getBasePath(),
                appId: kbnBaseUrl.slice('/app/'.length),
                appPath: kbnUrl.eval(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id }),
              });
              // Manually insert a new url so the back button will open the saved visualization.
              $window.history.pushState({}, '', savedVisualizationParsedUrl.getRootRelativePath());
              setActiveUrl(savedVisualizationParsedUrl.appPath);

              const lastDashboardAbsoluteUrl = chrome.navLinks.get('kibana:dashboard').url;
              const dashboardParsedUrl = absoluteToParsedUrl(
                lastDashboardAbsoluteUrl,
                getBasePath()
              );
              dashboardParsedUrl.addQueryParameter(
                DashboardConstants.ADD_EMBEDDABLE_TYPE,
                VISUALIZE_EMBEDDABLE_TYPE
              );
              dashboardParsedUrl.addQueryParameter(
                DashboardConstants.ADD_EMBEDDABLE_ID,
                savedVis.id
              );
              kbnUrl.change(dashboardParsedUrl.appPath);
            } else if (savedVis.id === $route.current.params.id) {
              chrome.docTitle.change(savedVis.lastSavedTitle);
              chrome.setBreadcrumbs($injector.invoke(getEditBreadcrumbs));
              savedVis.vis.title = savedVis.title;
              savedVis.vis.description = savedVis.description;
            } else {
              history.replace({
                ...history.location,
                pathname: `${VisualizeConstants.EDIT_PATH}/${savedVis.id}`,
              });
            }
          }
        });
        return { id };
      },
      error => {
        // eslint-disable-next-line
        console.error(error);
        toastNotifications.addDanger({
          title: i18n.translate(
            'kbn.visualize.topNavMenu.saveVisualization.failureNotificationText',
            {
              defaultMessage: `Error on saving '{visTitle}'`,
              values: {
                visTitle: savedVis.title,
              },
            }
          ),
          text: error.message,
          'data-test-subj': 'saveVisualizationError',
        });
        return { error };
      }
    );
  }

  const unlinkFromSavedSearch = () => {
    const searchSourceParent = savedSearch.searchSource;
    const searchSourceGrandparent = searchSourceParent.getParent();
    const currentIndex = searchSourceParent.getField('index');

    searchSource.setField('index', currentIndex);
    searchSource.setParent(searchSourceGrandparent);

    stateContainer.transitions.unlinkSavedSearch({
      query: searchSourceParent.getField('query'),
      parentFilters: searchSourceParent.getOwnField('filter'),
    });

    toastNotifications.addSuccess(
      i18n.translate('kbn.visualize.linkedToSearch.unlinkSuccessNotificationText', {
        defaultMessage: `Unlinked from saved search '{searchTitle}'`,
        values: {
          searchTitle: savedSearch.title,
        },
      })
    );
  };

  $scope.getAdditionalMessage = () => {
    return (
      '<i class="kuiIcon fa-flask"></i>' +
      i18n.translate('kbn.visualize.experimentalVisInfoText', {
        defaultMessage: 'This visualization is marked as experimental.',
      }) +
      ' ' +
      vis.type.feedbackMessage
    );
  };

  vis.on('unlinkFromSavedSearch', unlinkFromSavedSearch);

  addHelpMenuToAppChrome(chrome, docLinks);

  init();
}
