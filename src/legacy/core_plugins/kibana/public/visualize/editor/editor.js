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
import { i18n } from '@kbn/i18n';
import '../saved_visualizations/saved_visualizations';

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { migrateAppState } from './lib';
import { DashboardConstants } from '../../dashboard/dashboard_constants';
import { VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { addHelpMenuToAppChrome } from '../help_menu/help_menu_util';
import { FilterStateManager } from '../../../../data/public/filter/filter_manager';
import { unhashUrl } from '../../../../../../plugins/kibana_utils/public';

import { initVisEditorDirective } from './visualization_editor';
import { initVisualizationDirective } from './visualization';

import {
  absoluteToParsedUrl,
  KibanaParsedUrl,
  migrateLegacyQuery,
  SavedObjectSaveModal,
  showSaveModal,
  stateMonitorFactory,
  subscribeWithScope,
} from '../legacy_imports';

import { getServices } from '../kibana_services';

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
  $element,
  $route,
  AppState,
  $window,
  $injector,
  $timeout,
  kbnUrl,
  redirectWhenMissing,
  Promise,
  kbnBaseUrl,
  getAppState,
  globalState
) {
  const {
    indexPatterns,
    localStorage,
    visualizeCapabilities,
    share,
    data: {
      query: {
        filterManager,
        timefilter: { timefilter },
      },
    },
    toastNotifications,
    legacyChrome,
    chrome,
    getBasePath,
    core: { docLinks },
    savedQueryService,
    uiSettings,
  } = getServices();

  const filterStateManager = new FilterStateManager(globalState, getAppState, filterManager);
  const queryFilter = filterManager;
  // Retrieve the resolved SavedVis instance.
  const savedVis = $route.current.locals.savedVis;
  const _applyVis = () => {
    $scope.$apply();
  };
  // This will trigger a digest cycle. This is needed when vis is updated from a global angular like in visualize_embeddable.js.
  savedVis.vis.on('apply', _applyVis);
  // vis is instance of src/legacy/ui/public/vis/vis.js.
  // SearchSource is a promise-based stream of search results that can inherit from other search sources.
  const { vis, searchSource } = savedVis;

  $scope.vis = vis;

  const $appStatus = (this.appStatus = {
    dirty: !savedVis.id,
  });

  $scope.isDirty = false;

  vis.on('dirtyStateChange', ({ isDirty }) => {
    $scope.$evalAsync(() => {
      $scope.isDirty = isDirty;
    });
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
              return Boolean($scope.isDirty);
            },
            tooltip() {
              if ($scope.isDirty) {
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
        const hasUnappliedChanges = $scope.isDirty;
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

  let stateMonitor;

  if (savedVis.id) {
    chrome.docTitle.change(savedVis.title);
  }

  // Extract visualization state with filtered aggs. You can see these filtered aggs in the URL.
  // Consists of things like aggs, params, listeners, title, type, etc.
  const savedVisState = vis.getState();
  const stateDefaults = {
    uiState: savedVis.uiStateJSON ? JSON.parse(savedVis.uiStateJSON) : {},
    linked: !!savedVis.savedSearchId,
    query: searchSource.getOwnField('query') || {
      query: '',
      language:
        localStorage.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
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

  $scope.showSaveQuery = visualizeCapabilities.saveQuery;

  $scope.$watch(
    () => visualizeCapabilities.saveQuery,
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

    $scope.$watch('state.query', (newQuery, oldQuery) => {
      if (!_.isEqual(newQuery, oldQuery)) {
        const query = migrateLegacyQuery(newQuery);
        if (!_.isEqual(query, newQuery)) {
          $state.query = query;
        }
        $scope.fetch();
      }
    });

    $state.replace();

    const updateTimeRange = () => {
      $scope.timeRange = timefilter.getTime();
      $scope.$broadcast('render');
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

    subscriptions.add(
      chrome.getIsVisible$().subscribe(isVisible => {
        $scope.$evalAsync(() => {
          $scope.isVisible = isVisible;
        });
      })
    );

    // update the searchSource when query updates
    $scope.fetch = function() {
      $state.save();
      $scope.query = $state.query;
      savedVis.searchSource.setField('query', $state.query);
      savedVis.searchSource.setField('filter', $state.filters);
      $scope.$broadcast('render');
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

    subscriptions.add(
      subscribeWithScope($scope, timefilter.getAutoRefreshFetch$(), {
        next: () => {
          $scope.vis.forceReload();
        },
      })
    );

    $scope.$on('$destroy', () => {
      if ($scope._handler) {
        $scope._handler.destroy();
      }
      savedVis.destroy();
      stateMonitor.destroy();
      filterStateManager.destroy();
      subscriptions.unsubscribe();
      $scope.vis.off('apply', _applyVis);
    });

    $timeout(() => {
      $scope.$broadcast('render');
    });
  }

  $scope.updateQueryAndFetch = function({ query, dateRange }) {
    const isUpdate =
      (query && !_.isEqual(query, $state.query)) ||
      (dateRange && !_.isEqual(dateRange, $scope.timeRange));

    $state.query = query;
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
      language:
        localStorage.get('kibana.userQueryLanguage') || uiSettings.get('search:queryLanguage'),
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
                basePath: getBasePath(),
                appId: kbnBaseUrl.slice('/app/'.length),
                appPath: kbnUrl.eval(`${VisualizeConstants.EDIT_PATH}/{{id}}`, { id: savedVis.id }),
              });
              // Manually insert a new url so the back button will open the saved visualization.
              $window.history.pushState({}, '', savedVisualizationParsedUrl.getRootRelativePath());
              // Since we aren't reloading the page, only inserting a new browser history item, we need to manually update
              // the last url for this app, so directly clicking on the Visualize tab will also bring the user to the saved
              // url, not the unsaved one.
              legacyChrome.trackSubUrlForApp('kibana:visualize', savedVisualizationParsedUrl);

              const lastDashboardAbsoluteUrl = chrome.navLinks.get('kibana:dashboard').url;
              const dashboardParsedUrl = absoluteToParsedUrl(
                lastDashboardAbsoluteUrl,
                getBasePath()
              );
              dashboardParsedUrl.addQueryParameter(
                DashboardConstants.NEW_VISUALIZATION_ID_PARAM,
                savedVis.id
              );
              kbnUrl.change(dashboardParsedUrl.appPath);
            } else if (savedVis.id === $route.current.params.id) {
              chrome.docTitle.change(savedVis.lastSavedTitle);
              chrome.setBreadcrumbs($injector.invoke(getEditBreadcrumbs));
              savedVis.vis.title = savedVis.title;
              savedVis.vis.description = savedVis.description;
              // it's needed to save the state to update url string
              $state.save();
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

  addHelpMenuToAppChrome(chrome, docLinks);

  init();
}
