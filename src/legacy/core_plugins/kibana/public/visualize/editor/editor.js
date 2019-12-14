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
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';
import '../saved_visualizations/saved_visualizations';
import './visualization_editor';
import 'ui/vis/editors/default/sidebar';
import 'ui/visualize';
import 'ui/collapsible_sidebar';

import { capabilities } from 'ui/capabilities';
import chrome from 'ui/chrome';
import React from 'react';
import angular from 'angular';
import { FormattedMessage } from '@kbn/i18n/react';
import { toastNotifications } from 'ui/notify';
import { docTitle } from 'ui/doc_title';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import { migrateAppState } from './lib';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import editorTemplate from './editor.html';
import { DashboardConstants } from '../../dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import { KibanaParsedUrl } from 'ui/url/kibana_parsed_url';
import { absoluteToParsedUrl } from 'ui/url/absolute_to_parsed_url';
import { migrateLegacyQuery } from 'ui/utils/migrate_legacy_query';
import { subscribeWithScope } from 'ui/utils/subscribe_with_scope';
import { timefilter } from 'ui/timefilter';
import { getVisualizeLoader } from '../../../../../ui/public/visualize/loader';
import { showShareContextMenu, ShareContextMenuExtensionsRegistryProvider } from 'ui/share';
import { getUnhashableStatesProvider } from 'ui/state_management/state_hashing';
import { showSaveModal } from 'ui/saved_objects/show_saved_object_save_modal';
import { SavedObjectSaveModal } from 'ui/saved_objects/components/saved_object_save_modal';
import { getEditBreadcrumbs, getCreateBreadcrumbs } from '../breadcrumbs';
import { npStart } from 'ui/new_platform';

import { extractTimeFilter, changeTimeFilter } from '../../../../data/public';
import { start as data } from '../../../../data/public/legacy';
import { start as visualizations } from '../../../../visualizations/public/np_ready/public/legacy';

const { savedQueryService } = data.search.services;

uiRoutes
  .when(VisualizeConstants.CREATE_PATH, {
    template: editorTemplate,
    k7Breadcrumbs: getCreateBreadcrumbs,
    resolve: {
      savedVis: function(savedVisualizations, redirectWhenMissing, $route) {
        const visTypes = visualizations.types.all();
        const visType = _.find(visTypes, { name: $route.current.params.type });
        const shouldHaveIndex = visType.requiresSearch && visType.options.showIndexSelection;
        const hasIndex = $route.current.params.indexPattern || $route.current.params.savedSearchId;
        if (shouldHaveIndex && !hasIndex) {
          throw new Error(
            i18n.translate(
              'kbn.visualize.createVisualization.noIndexPatternOrSavedSearchIdErrorMessage',
              {
                defaultMessage: 'You must provide either an indexPattern or a savedSearchId',
              }
            )
          );
        }

        return savedVisualizations
          .get($route.current.params)
          .then(savedVis => {
            if (savedVis.vis.type.setup) {
              return savedVis.vis.type.setup(savedVis).catch(() => savedVis);
            }
            return savedVis;
          })
          .catch(
            redirectWhenMissing({
              '*': '/visualize',
            })
          );
      },
    },
  })
  .when(`${VisualizeConstants.EDIT_PATH}/:id`, {
    template: editorTemplate,
    k7Breadcrumbs: getEditBreadcrumbs,
    resolve: {
      savedVis: function(savedVisualizations, redirectWhenMissing, $route) {
        return savedVisualizations
          .get($route.current.params.id)
          .then(savedVis => {
            npStart.core.chrome.recentlyAccessed.add(
              savedVis.getFullPath(),
              savedVis.title,
              savedVis.id
            );
            return savedVis;
          })
          .then(savedVis => {
            if (savedVis.vis.type.setup) {
              return savedVis.vis.type.setup(savedVis).catch(() => savedVis);
            }
            return savedVis;
          })
          .catch(
            redirectWhenMissing({
              visualization: '/visualize',
              search: '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
              'index-pattern':
                '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
              'index-pattern-field':
                '/management/kibana/objects/savedVisualizations/' + $route.current.params.id,
            })
          );
      },
    },
  });

uiModules.get('app/visualize', ['kibana/url']).directive('visualizeApp', function() {
  return {
    restrict: 'E',
    controllerAs: 'visualizeApp',
    controller: VisEditor,
  };
});

function VisEditor(
  $scope,
  $element,
  $route,
  AppState,
  $window,
  $injector,
  indexPatterns,
  kbnUrl,
  redirectWhenMissing,
  Private,
  Promise,
  config,
  kbnBaseUrl,
  localStorage,
  // unused but required to initialize auto refresh :-\
  /* eslint-disable no-unused-vars */
  courier
) {
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const getUnhashableStates = Private(getUnhashableStatesProvider);
  const shareContextMenuExtensions = Private(ShareContextMenuExtensionsRegistryProvider);

  // Retrieve the resolved SavedVis instance.
  const savedVis = $route.current.locals.savedVis;
  // vis is instance of src/legacy/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const { vis, searchSource } = savedVis;

  $scope.vis = vis;

  const $appStatus = (this.appStatus = {
    dirty: !savedVis.id,
  });

  $scope.topNavMenu = [
    ...(capabilities.get().visualize.save
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
                />
              );
              showSaveModal(saveModal);
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
        showShareContextMenu({
          anchorElement,
          allowEmbed: true,
          allowShortUrl: capabilities.get().visualize.createShortUrl,
          getUnhashableStates,
          objectId: savedVis.id,
          objectType: 'visualization',
          shareContextMenuExtensions,
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

  let stateMonitor;

  if (savedVis.id) {
    docTitle.change(savedVis.title);
  }

  // Extract visualization state with filtered aggs. You can see these filtered aggs in the URL.
  // Consists of things like aggs, params, listeners, title, type, etc.
  const savedVisState = vis.getState();
  const stateDefaults = {
    uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
    linked: !!savedVis.savedSearchId,
    query: searchSource.getOwnField('query') || {
      query: '',
      language: localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
    },
    filters: searchSource.getOwnField('filter') || [],
    vis: savedVisState,
  };

  // Instance of app_state.js.
  const $state = (function initState() {
    // This is used to sync visualization state with the url when `appState.save()` is called.
    const appState = new AppState(stateDefaults);

    // Initializing appState does two things - first it translates the defaults into AppState,
    // second it updates appState based on the url (the url trumps the defaults). This means if
    // we update the state format at all and want to handle BWC, we must not only migrate the
    // data stored with saved vis, but also any old state in the url.
    migrateAppState(appState);

    // The savedVis is pulled from elasticsearch, but the appState is pulled from the url, with the
    // defaults applied. If the url was from a previous session which included modifications to the
    // appState then they won't be equal.
    if (!angular.equals(appState.vis, savedVisState)) {
      Promise.try(function() {
        vis.setState(appState.vis);
      }).catch(
        redirectWhenMissing({
          'index-pattern-field': '/visualize',
        })
      );
    }

    return appState;
  })();

  $scope.filters = queryFilter.getFilters();

  $scope.onFiltersUpdated = filters => {
    // The filters will automatically be set when the queryFilter emits an update event (see below)
    queryFilter.setFilters(filters);
  };

  $scope.onCancelApplyFilters = () => {
    $scope.state.$newFilters = [];
  };

  $scope.onApplyFilters = filters => {
    const { timeRangeFilter, restOfFilters } = extractTimeFilter(
      $scope.indexPattern.timeFieldName,
      filters
    );
    queryFilter.addFilters(restOfFilters);
    if (timeRangeFilter) changeTimeFilter(timefilter, timeRangeFilter);
    $scope.state.$newFilters = [];
  };

  $scope.$watch('state.$newFilters', (filters = []) => {
    if (filters.length === 1) {
      $scope.onApplyFilters(filters);
    }
  });

  $scope.showSaveQuery = capabilities.get().visualize.saveQuery;

  $scope.$watch(
    () => capabilities.get().visualize.saveQuery,
    newCapability => {
      $scope.showSaveQuery = newCapability;
    }
  );

  function init() {
    // export some objects
    $scope.savedVis = savedVis;
    if (vis.indexPattern) {
      $scope.indexPattern = vis.indexPattern;
    } else {
      indexPatterns.getDefault().then(defaultIndexPattern => {
        $scope.indexPattern = defaultIndexPattern;
      });
    }

    $scope.searchSource = searchSource;
    $scope.state = $state;
    $scope.refreshInterval = timefilter.getRefreshInterval();

    // Create a PersistedState instance.
    $scope.uiState = $state.makeStateful('uiState');
    $scope.appStatus = $appStatus;

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
      return vis.type.options.showTimePicker;
    };

    $scope.timeRange = timefilter.getTime();
    $scope.opts = _.pick($scope, 'savedVis', 'isAddToDashMode');

    stateMonitor = stateMonitorFactory.create($state, stateDefaults);
    stateMonitor.ignoreProps(['vis.listeners']).onChange(status => {
      $appStatus.dirty = status.dirty || !savedVis.id;
    });

    $scope.$watch('state.query', newQuery => {
      const query = migrateLegacyQuery(newQuery);
      $scope.updateQueryAndFetch({ query });
    });

    $state.replace();

    const updateTimeRange = () => {
      $scope.timeRange = timefilter.getTime();
      // In case we are running in embedded mode (i.e. we used the visualize loader to embed)
      // the visualization, we need to update the timeRange on the visualize handler.
      if ($scope._handler) {
        $scope._handler.update({
          timeRange: $scope.timeRange,
        });
      }
    };

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

    // update the searchSource when query updates
    $scope.fetch = function() {
      $state.save();
      savedVis.searchSource.setField('query', $state.query);
      savedVis.searchSource.setField('filter', $state.filters);
      $scope.vis.forceReload();
    };

    // update the searchSource when filters update
    subscriptions.add(
      subscribeWithScope($scope, queryFilter.getUpdates$(), {
        next: () => {
          $scope.filters = queryFilter.getFilters();
          $scope.globalFilters = queryFilter.getGlobalFilters();
        },
      })
    );
    subscriptions.add(
      subscribeWithScope($scope, queryFilter.getFetches$(), {
        next: $scope.fetch,
      })
    );

    $scope.$on('$destroy', function() {
      if ($scope._handler) {
        $scope._handler.destroy();
      }
      savedVis.destroy();
      stateMonitor.destroy();
      subscriptions.unsubscribe();
    });

    if (!$scope.chrome.getVisible()) {
      getVisualizeLoader().then(loader => {
        $scope._handler = loader.embedVisualizationWithSavedObject(
          $element.find('.visualize')[0],
          savedVis,
          {
            timeRange: $scope.timeRange,
            uiState: $scope.uiState,
            appState: $state,
            listenOnChange: false,
          }
        );
      });
    }
  }

  $scope.updateQueryAndFetch = function({ query, dateRange }) {
    const isUpdate =
      (query && !_.isEqual(query, $state.query)) ||
      (dateRange && !_.isEqual(dateRange, $scope.timeRange));

    $state.query = query;
    timefilter.setTime(dateRange);

    // If nothing has changed, trigger the fetch manually, otherwise it will happen as a result of the changes
    if (!isUpdate) $scope.fetch();
  };

  $scope.onRefreshChange = function({ isPaused, refreshInterval }) {
    timefilter.setRefreshInterval({
      pause: isPaused,
      value: refreshInterval ? refreshInterval : $scope.refreshInterval.value,
    });
  };

  $scope.onQuerySaved = savedQuery => {
    $scope.savedQuery = savedQuery;
  };

  $scope.onSavedQueryUpdated = savedQuery => {
    $scope.savedQuery = { ...savedQuery };
  };

  $scope.onClearSavedQuery = () => {
    delete $scope.savedQuery;
    delete $state.savedQuery;
    $state.query = {
      query: '',
      language: localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage'),
    };
    queryFilter.removeAll();
    $state.save();
    $scope.fetch();
  };

  const updateStateFromSavedQuery = savedQuery => {
    $state.query = savedQuery.attributes.query;
    $state.save();

    queryFilter.setFilters(savedQuery.attributes.filters || []);

    if (savedQuery.attributes.timefilter) {
      timefilter.setTime({
        from: savedQuery.attributes.timefilter.from,
        to: savedQuery.attributes.timefilter.to,
      });
      if (savedQuery.attributes.timefilter.refreshInterval) {
        timefilter.setRefreshInterval(savedQuery.attributes.timefilter.refreshInterval);
      }
    }

    $scope.fetch();
  };

  $scope.$watch('savedQuery', newSavedQuery => {
    if (!newSavedQuery) return;
    $state.savedQuery = newSavedQuery.id;
    $state.save();

    updateStateFromSavedQuery(newSavedQuery);
  });

  $scope.$watch('state.savedQuery', newSavedQueryId => {
    if (!newSavedQueryId) {
      $scope.savedQuery = undefined;
      return;
    }
    if (!$scope.savedQuery || newSavedQueryId !== $scope.savedQuery.id) {
      savedQueryService.getSavedQuery(newSavedQueryId).then(savedQuery => {
        $scope.$evalAsync(() => {
          $scope.savedQuery = savedQuery;
          updateStateFromSavedQuery(savedQuery);
        });
      });
    }
  });

  /**
   * Called when the user clicks "Save" button.
   */
  function doSave(saveOptions) {
    // vis.title was not bound and it's needed to reflect title into visState
    $state.vis.title = savedVis.title;
    $state.vis.type = savedVis.type || $state.vis.type;
    savedVis.visState = $state.vis;
    savedVis.uiStateJSON = angular.toJson($scope.uiState.getChanges());

    return savedVis.save(saveOptions).then(
      function(id) {
        $scope.$evalAsync(() => {
          stateMonitor.setInitialState($state.toJSON());

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
                basePath: chrome.getBasePath(),
                appId: kbnBaseUrl.slice('/app/'.length),
                appPath: kbnUrl.eval(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id }),
              });
              // Manually insert a new url so the back button will open the saved visualization.
              $window.history.pushState({}, '', savedVisualizationParsedUrl.getRootRelativePath());
              // Since we aren't reloading the page, only inserting a new browser history item, we need to manually update
              // the last url for this app, so directly clicking on the Visualize tab will also bring the user to the saved
              // url, not the unsaved one.
              chrome.trackSubUrlForApp('kibana:visualize', savedVisualizationParsedUrl);

              const lastDashboardAbsoluteUrl = npStart.core.chrome.navLinks.get('kibana:dashboard')
                .url;
              const dashboardParsedUrl = absoluteToParsedUrl(
                lastDashboardAbsoluteUrl,
                chrome.getBasePath()
              );
              dashboardParsedUrl.addQueryParameter(
                DashboardConstants.NEW_VISUALIZATION_ID_PARAM,
                savedVis.id
              );
              kbnUrl.change(dashboardParsedUrl.appPath);
            } else if (savedVis.id === $route.current.params.id) {
              docTitle.change(savedVis.lastSavedTitle);
              chrome.breadcrumbs.set($injector.invoke(getEditBreadcrumbs));
            } else {
              kbnUrl.change(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id });
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

  $scope.unlink = function() {
    if (!$state.linked) return;

    $state.linked = false;
    const searchSourceParent = searchSource.getParent();
    const searchSourceGrandparent = searchSourceParent.getParent();

    delete savedVis.savedSearchId;
    delete vis.savedSearchId;
    searchSourceParent.setField(
      'filter',
      _.union(searchSource.getOwnField('filter'), searchSourceParent.getOwnField('filter'))
    );

    $state.query = searchSourceParent.getField('query');
    $state.filters = searchSourceParent.getField('filter');
    searchSource.setField('index', searchSourceParent.getField('index'));
    searchSource.setParent(searchSourceGrandparent);

    toastNotifications.addSuccess(
      i18n.translate('kbn.visualize.linkedToSearch.unlinkSuccessNotificationText', {
        defaultMessage: `Unlinked from saved search '{searchTitle}'`,
        values: {
          searchTitle: savedVis.savedSearch.title,
        },
      })
    );

    $scope.fetch();
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

  init();
}
