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
import { EventEmitter } from 'events';

import React from 'react';
import { makeStateful, useVisualizeAppState } from './lib';
import { VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { EMBEDDABLE_ORIGINATING_APP_PARAM } from '../../../../embeddable/public';

import { addHelpMenuToAppChrome } from '../help_menu/help_menu_util';
import { unhashUrl, removeQueryParam } from '../../../../kibana_utils/public';
import { MarkdownSimple, toMountPoint } from '../../../../kibana_react/public';
import {
  addFatalError,
  subscribeWithScope,
  migrateLegacyQuery,
} from '../../../../kibana_legacy/public';
import { showSaveModal, SavedObjectSaveModalOrigin } from '../../../../saved_objects/public';
import {
  esFilters,
  connectToQueryState,
  syncQueryStateWithUrl,
  UI_SETTINGS,
} from '../../../../data/public';

import { initVisEditorDirective } from './visualization_editor';
import { initVisualizationDirective } from './visualization';

import { getServices } from '../../kibana_services';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../visualizations/public';

export function initEditorDirective(app, deps) {
  app.directive('visualizeApp', function () {
    return {
      restrict: 'E',
      controllerAs: 'visualizeApp',
      controller: VisualizeAppController,
    };
  });

  initVisEditorDirective(app, deps);
  initVisualizationDirective(app, deps);
}

function VisualizeAppController($scope, $route, $injector, $timeout, kbnUrlStateStorage, history) {
  const {
    localStorage,
    visualizeCapabilities,
    share,
    data: { query: queryService, indexPatterns },
    toastNotifications,
    chrome,
    core: { docLinks, fatalErrors, uiSettings, application },
    I18nContext,
    setActiveUrl,
    visualizations,
    dashboard,
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
  const { vis, savedVis, savedSearch, embeddableHandler } = $route.current.locals.resolved;
  $scope.eventEmitter = new EventEmitter();
  const _applyVis = () => {
    $scope.$apply();
  };
  // This will trigger a digest cycle. This is needed when vis is updated from a global angular like in visualize_embeddable.js.
  $scope.eventEmitter.on('apply', _applyVis);
  // vis is instance of src/legacy/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const searchSource = vis.data.searchSource;

  $scope.vis = vis;
  $scope.savedSearch = savedSearch;

  const $appStatus = {
    dirty: !savedVis.id,
  };

  const defaultQuery = {
    query: '',
    language:
      localStorage.get('kibana.userQueryLanguage') ||
      uiSettings.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE),
  };

  const originatingApp = $route.current.params[EMBEDDABLE_ORIGINATING_APP_PARAM];
  removeQueryParam(history, EMBEDDABLE_ORIGINATING_APP_PARAM);
  $scope.getOriginatingApp = () => originatingApp;

  const visStateToEditorState = () => {
    const savedVisState = visualizations.convertFromSerializedVis(vis.serialize());
    return {
      uiState: vis.uiState.toJSON(),
      query: vis.data.searchSource.getOwnField('query') || defaultQuery,
      filters: vis.data.searchSource.getOwnField('filter') || [],
      vis: { ...savedVisState.visState, title: vis.title },
      linked: !!savedVis.savedSearchId,
    };
  };

  const stateDefaults = visStateToEditorState();

  const { stateContainer, stopStateSync } = useVisualizeAppState({
    stateDefaults,
    kbnUrlStateStorage,
  });

  $scope.eventEmitter.on('dirtyStateChange', ({ isDirty }) => {
    if (!isDirty) {
      stateContainer.transitions.updateVisState(visStateToEditorState().vis);
    }
    $timeout(() => {
      $scope.dirty = isDirty;
    });
  });

  $scope.eventEmitter.on('updateVis', () => {
    embeddableHandler.reload();
  });

  $scope.embeddableHandler = embeddableHandler;

  $scope.topNavMenu = [
    ...($scope.getOriginatingApp() && savedVis.id
      ? [
          {
            id: 'saveAndReturn',
            label: i18n.translate('visualize.topNavMenu.saveAndReturnVisualizationButtonLabel', {
              defaultMessage: 'Save and return',
            }),
            emphasize: true,
            iconType: 'check',
            description: i18n.translate(
              'visualize.topNavMenu.saveAndReturnVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Finish editing visualization and return to the last app',
              }
            ),
            testId: 'visualizesaveAndReturnButton',
            disableButton() {
              return Boolean($scope.dirty);
            },
            tooltip() {
              if ($scope.dirty) {
                return i18n.translate(
                  'visualize.topNavMenu.saveAndReturnVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before finishing',
                  }
                );
              }
            },
            run: async () => {
              const saveOptions = {
                confirmOverwrite: false,
                returnToOrigin: true,
              };
              return doSave(saveOptions);
            },
          },
        ]
      : []),
    ...(visualizeCapabilities.save
      ? [
          {
            id: 'save',
            label:
              savedVis.id && $scope.getOriginatingApp()
                ? i18n.translate('visualize.topNavMenu.saveVisualizationAsButtonLabel', {
                    defaultMessage: 'save as',
                  })
                : i18n.translate('visualize.topNavMenu.saveVisualizationButtonLabel', {
                    defaultMessage: 'save',
                  }),
            emphasize: !savedVis.id || !$scope.getOriginatingApp(),
            description: i18n.translate('visualize.topNavMenu.saveVisualizationButtonAriaLabel', {
              defaultMessage: 'Save Visualization',
            }),
            testId: 'visualizeSaveButton',
            disableButton() {
              return Boolean($scope.dirty);
            },
            tooltip() {
              if ($scope.dirty) {
                return i18n.translate(
                  'visualize.topNavMenu.saveVisualizationDisabledButtonTooltip',
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
                returnToOrigin,
              }) => {
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                savedVis.copyOnSave = newCopyOnSave;
                savedVis.description = newDescription;
                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin,
                };
                return doSave(saveOptions).then((response) => {
                  // If the save wasn't successful, put the original values back.
                  if (!response.id || response.error) {
                    savedVis.title = currentTitle;
                  }
                  return response;
                });
              };

              const saveModal = (
                <SavedObjectSaveModalOrigin
                  documentInfo={savedVis}
                  onSave={onSave}
                  objectType={'visualization'}
                  onClose={() => {}}
                  originatingApp={$scope.getOriginatingApp()}
                />
              );
              showSaveModal(saveModal, I18nContext);
            },
          },
        ]
      : []),
    {
      id: 'share',
      label: i18n.translate('visualize.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('visualize.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: (anchorElement) => {
        const hasUnappliedChanges = $scope.dirty;
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
      // disable the Share button if no action specified
      disableButton: !share,
    },
    {
      id: 'inspector',
      label: i18n.translate('visualize.topNavMenu.openInspectorButtonLabel', {
        defaultMessage: 'inspect',
      }),
      description: i18n.translate('visualize.topNavMenu.openInspectorButtonAriaLabel', {
        defaultMessage: 'Open Inspector for visualization',
      }),
      testId: 'openInspectorButton',
      disableButton() {
        return !embeddableHandler.hasInspector || !embeddableHandler.hasInspector();
      },
      run() {
        const inspectorSession = embeddableHandler.openInspector();

        if (inspectorSession) {
          // Close the inspector if this scope is destroyed (e.g. because the user navigates away).
          const removeWatch = $scope.$on('$destroy', () => inspectorSession.close());
          // Remove that watch in case the user closes the inspector session herself.
          inspectorSession.onClose.finally(removeWatch);
        }
      },
      tooltip() {
        if (!embeddableHandler.hasInspector || !embeddableHandler.hasInspector()) {
          return i18n.translate('visualize.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
  ];

  if (savedVis.id) {
    chrome.docTitle.change(savedVis.title);
  }

  // sync initial app filters from state to filterManager
  filterManager.setAppFilters(_.cloneDeep(stateContainer.getState().filters));
  // setup syncing of app filters between appState and filterManager
  const stopSyncingAppFilters = connectToQueryState(
    queryService,
    {
      set: ({ filters }) => stateContainer.transitions.set('filters', filters),
      get: () => ({ filters: stateContainer.getState().filters }),
      state$: stateContainer.state$.pipe(map((state) => ({ filters: state.filters }))),
    },
    {
      filters: esFilters.FilterStateStore.APP_STATE,
    }
  );

  const stopAllSyncing = () => {
    stopStateSync();
    stopSyncingQueryServiceStateWithUrl();
    stopSyncingAppFilters();
  };

  // The savedVis is pulled from elasticsearch, but the appState is pulled from the url, with the
  // defaults applied. If the url was from a previous session which included modifications to the
  // appState then they won't be equal.
  if (!_.isEqual(stateContainer.getState().vis, stateDefaults.vis)) {
    try {
      const { aggs, ...visState } = stateContainer.getState().vis;
      vis.setState({ ...visState, data: { aggs } });
    } catch (error) {
      // stop syncing url updtes with the state to prevent extra syncing
      stopAllSyncing();

      toastNotifications.addWarning({
        title: i18n.translate('visualize.visualizationTypeInvalidNotificationMessage', {
          defaultMessage: 'Invalid visualization type',
        }),
        text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
      });

      history.replace(`${VisualizeConstants.LANDING_PAGE_PATH}?notFound=visualization`);

      // prevent further controller execution
      return;
    }
  }

  $scope.filters = filterManager.getFilters();

  $scope.onFiltersUpdated = (filters) => {
    // The filters will automatically be set when the filterManager emits an update event (see below)
    filterManager.setFilters(filters);
  };

  $scope.showSaveQuery = visualizeCapabilities.saveQuery;

  $scope.$watch(
    () => visualizeCapabilities.saveQuery,
    (newCapability) => {
      $scope.showSaveQuery = newCapability;
    }
  );

  const updateSavedQueryFromUrl = (savedQueryId) => {
    if (!savedQueryId) {
      delete $scope.savedQuery;

      return;
    }

    if ($scope.savedQuery && $scope.savedQuery.id === savedQueryId) {
      return;
    }

    queryService.savedQueries.getSavedQuery(savedQueryId).then((savedQuery) => {
      $scope.$evalAsync(() => {
        $scope.updateSavedQuery(savedQuery);
      });
    });
  };

  function init() {
    if (vis.data.indexPattern) {
      $scope.indexPattern = vis.data.indexPattern;
    } else {
      indexPatterns.getDefault().then((defaultIndexPattern) => {
        $scope.indexPattern = defaultIndexPattern;
      });
    }

    const initialState = stateContainer.getState();

    const handleLinkedSearch = (linked) => {
      if (linked && !savedVis.savedSearchId && savedSearch) {
        savedVis.savedSearchId = savedSearch.id;
        vis.data.savedSearchId = savedSearch.id;
        searchSource.setParent(savedSearch.searchSource);
      } else if (!linked && savedVis.savedSearchId) {
        delete savedVis.savedSearchId;
        delete vis.data.savedSearchId;
      }
    };

    // Create a PersistedState instance for uiState.
    const { persistedState, unsubscribePersisted, persistOnChange } = makeStateful(
      'uiState',
      stateContainer
    );
    vis.uiState = persistedState;
    vis.uiState.on('reload', embeddableHandler.reload);
    $scope.uiState = persistedState;
    $scope.savedVis = savedVis;
    $scope.query = initialState.query;
    $scope.searchSource = searchSource;
    $scope.refreshInterval = timefilter.getRefreshInterval();
    handleLinkedSearch(initialState.linked);

    $scope.showFilterBar = () => {
      return vis.type.options.showFilterBar;
    };

    $scope.showQueryInput = () => {
      return vis.type.requiresSearch && vis.type.options.showQueryBar;
    };

    $scope.showQueryBarTimePicker = () => {
      // tsvb loads without an indexPattern initially (TODO investigate).
      // hide timefilter only if timeFieldName is explicitly undefined.
      const hasTimeField = vis.data.indexPattern ? !!vis.data.indexPattern.timeFieldName : true;
      return vis.type.options.showTimePicker && hasTimeField;
    };

    $scope.timeRange = timefilter.getTime();

    const unsubscribeStateUpdates = stateContainer.subscribe((state) => {
      const newQuery = migrateLegacyQuery(state.query);
      if (!_.isEqual(state.query, newQuery)) {
        stateContainer.transitions.set('query', newQuery);
      }
      persistOnChange(state);
      updateSavedQueryFromUrl(state.savedQuery);

      // if the browser history was changed manually we need to reflect changes in the editor
      if (
        !_.isEqual(
          {
            ...visualizations.convertFromSerializedVis(vis.serialize()).visState,
            title: vis.title,
          },
          state.vis
        )
      ) {
        const { aggs, ...visState } = state.vis;
        vis.setState({
          ...visState,
          data: {
            aggs,
          },
        });
        embeddableHandler.reload();
        $scope.eventEmitter.emit('updateEditor');
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
      subscribeWithScope(
        $scope,
        timefilter.getRefreshIntervalUpdate$(),
        {
          next: () => {
            $scope.refreshInterval = timefilter.getRefreshInterval();
          },
        },
        (error) => addFatalError(fatalErrors, error)
      )
    );
    subscriptions.add(
      subscribeWithScope(
        $scope,
        timefilter.getTimeUpdate$(),
        {
          next: updateTimeRange,
        },
        (error) => addFatalError(fatalErrors, error)
      )
    );

    subscriptions.add(
      chrome.getIsVisible$().subscribe((isVisible) => {
        $scope.$evalAsync(() => {
          $scope.isVisible = isVisible;
        });
      })
    );

    // update the searchSource when query updates
    $scope.fetch = function () {
      const { query, linked, filters } = stateContainer.getState();
      $scope.query = query;
      handleLinkedSearch(linked);
      vis.data.searchSource.setField('query', query);
      vis.data.searchSource.setField('filter', filters);
      $scope.$broadcast('render');
    };

    // update the searchSource when filters update
    subscriptions.add(
      subscribeWithScope(
        $scope,
        filterManager.getUpdates$(),
        {
          next: () => {
            $scope.filters = filterManager.getFilters();
          },
        },
        (error) => addFatalError(fatalErrors, error)
      )
    );
    subscriptions.add(
      subscribeWithScope(
        $scope,
        filterManager.getFetches$(),
        {
          next: $scope.fetch,
        },
        (error) => addFatalError(fatalErrors, error)
      )
    );

    $scope.$on('$destroy', () => {
      if ($scope._handler) {
        $scope._handler.destroy();
      }
      savedVis.destroy();
      subscriptions.unsubscribe();
      $scope.eventEmitter.off('apply', _applyVis);

      unsubscribePersisted();
      vis.uiState.off('reload', embeddableHandler.reload);
      unsubscribeStateUpdates();

      stopAllSyncing();
    });

    $timeout(() => {
      $scope.$broadcast('render');
    });
  }

  $scope.updateQueryAndFetch = function ({ query, dateRange }) {
    const isUpdate =
      (query && !_.isEqual(query, stateContainer.getState().query)) ||
      (dateRange && !_.isEqual(dateRange, $scope.timeRange));

    stateContainer.transitions.set('query', query);
    timefilter.setTime(dateRange);

    // If nothing has changed, trigger the fetch manually, otherwise it will happen as a result of the changes
    if (!isUpdate) {
      embeddableHandler.reload();
    }
  };

  $scope.onRefreshChange = function ({ isPaused, refreshInterval }) {
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

  const updateStateFromSavedQuery = (savedQuery) => {
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

  $scope.updateSavedQuery = (savedQuery) => {
    $scope.savedQuery = savedQuery;
    updateStateFromSavedQuery(savedQuery);
  };

  /**
   * Called when the user clicks "Save" button.
   */
  function doSave(saveOptions) {
    // vis.title was not bound and it's needed to reflect title into visState
    const firstSave = !Boolean(savedVis.id);
    stateContainer.transitions.setVis({
      title: savedVis.title,
      type: savedVis.type || stateContainer.getState().vis.type,
    });
    savedVis.searchSourceFields = searchSource.getSerializedFields();
    savedVis.visState = stateContainer.getState().vis;
    savedVis.uiStateJSON = angular.toJson($scope.uiState.toJSON());
    $appStatus.dirty = false;

    return savedVis.save(saveOptions).then(
      function (id) {
        $scope.$evalAsync(() => {
          if (id) {
            toastNotifications.addSuccess({
              title: i18n.translate(
                'visualize.topNavMenu.saveVisualization.successNotificationText',
                {
                  defaultMessage: `Saved '{visTitle}'`,
                  values: {
                    visTitle: savedVis.title,
                  },
                }
              ),
              'data-test-subj': 'saveVisualizationSuccess',
            });

            if ($scope.getOriginatingApp() && saveOptions.returnToOrigin) {
              const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(savedVis.id)}`;

              // Manually insert a new url so the back button will open the saved visualization.
              history.replace(appPath);
              setActiveUrl(appPath);
              const lastAppType = $scope.getOriginatingApp();

              if (lastAppType === 'dashboards') {
                const savedVisId = firstSave || savedVis.copyOnSave ? savedVis.id : '';
                dashboard.addEmbeddableToDashboard({
                  embeddableId: savedVisId,
                  embeddableType: VISUALIZE_EMBEDDABLE_TYPE,
                });
              } else {
                application.navigateToApp(lastAppType);
              }
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
      (error) => {
        // eslint-disable-next-line
        console.error(error);
        toastNotifications.addDanger({
          title: i18n.translate('visualize.topNavMenu.saveVisualization.failureNotificationText', {
            defaultMessage: `Error on saving '{visTitle}'`,
            values: {
              visTitle: savedVis.title,
            },
          }),
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
      i18n.translate('visualize.linkedToSearch.unlinkSuccessNotificationText', {
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
      i18n.translate('visualize.experimentalVisInfoText', {
        defaultMessage: 'This visualization is marked as experimental.',
      }) +
      ' ' +
      vis.type.feedbackMessage
    );
  };

  $scope.eventEmitter.on('unlinkFromSavedSearch', unlinkFromSavedSearch);

  addHelpMenuToAppChrome(chrome, docLinks);

  init();
}
