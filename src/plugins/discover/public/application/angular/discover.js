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
import React from 'react';
import { Subscription, Subject, merge } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { getState, splitState } from './discover_state';

import { RequestAdapter } from '../../../../inspector/public';
import { SavedObjectSaveModal, showSaveModal } from '../../../../saved_objects/public';
import { getSortArray, getSortForSearchSource } from './doc_table';
import * as columnActions from './doc_table/actions/columns';

import indexTemplate from './discover.html';
import { showOpenSearchPanel } from '../components/top_nav/show_open_search_panel';
import { addHelpMenuToAppChrome } from '../components/help_menu/help_menu_util';
import '../components/fetch_error';
import { getPainlessError } from './get_painless_error';
import { discoverResponseHandler } from './response_handler';
import {
  getRequestInspectorStats,
  getResponseInspectorStats,
  getServices,
  getUrlTracker,
  unhashUrl,
  subscribeWithScope,
  tabifyAggResponse,
  getAngularModule,
  redirectWhenMissing,
} from '../../kibana_services';

const {
  core,
  chrome,
  data,
  history: getHistory,
  indexPatterns,
  filterManager,
  share,
  timefilter,
  toastNotifications,
  uiSettings: config,
  visualizations,
} = getServices();

import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../helpers/breadcrumbs';
import { validateTimeRange } from '../helpers/validate_time_range';
import {
  esFilters,
  indexPatterns as indexPatternsUtils,
  connectToQueryState,
  syncQueryStateWithUrl,
  getDefaultQuery,
  search,
  UI_SETTINGS,
} from '../../../../data/public';
import { getIndexPatternId } from '../helpers/get_index_pattern_id';
import { addFatalError } from '../../../../kibana_legacy/public';
import {
  DEFAULT_COLUMNS_SETTING,
  SAMPLE_SIZE_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
  SEARCH_ON_PAGE_LOAD_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
} from '../../../common';

const fetchStatuses = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading',
  COMPLETE: 'complete',
};

const app = getAngularModule();

app.config(($routeProvider) => {
  const defaults = {
    requireDefaultIndex: true,
    requireUICapability: 'discover.show',
    k7Breadcrumbs: ($route, $injector) =>
      $injector.invoke($route.current.params.id ? getSavedSearchBreadcrumbs : getRootBreadcrumbs),
    badge: (uiCapabilities) => {
      if (uiCapabilities.discover.save) {
        return undefined;
      }

      return {
        text: i18n.translate('discover.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n.translate('discover.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to save searches',
        }),
        iconType: 'glasses',
      };
    },
  };
  const discoverRoute = {
    ...defaults,
    template: indexTemplate,
    reloadOnSearch: false,
    resolve: {
      savedObjects: function ($route, Promise) {
        const history = getHistory();
        const savedSearchId = $route.current.params.id;
        return data.indexPatterns.ensureDefaultIndexPattern(history).then(() => {
          const { appStateContainer } = getState({ history });
          const { index } = appStateContainer.getState();
          return Promise.props({
            ip: indexPatterns.getCache().then((indexPatternList) => {
              /**
               *  In making the indexPattern modifiable it was placed in appState. Unfortunately,
               *  the load order of AppState conflicts with the load order of many other things
               *  so in order to get the name of the index we should use, and to switch to the
               *  default if necessary, we parse the appState with a temporary State object and
               *  then destroy it immediatly after we're done
               *
               *  @type {State}
               */
              const id = getIndexPatternId(index, indexPatternList, config.get('defaultIndex'));
              return Promise.props({
                list: indexPatternList,
                loaded: indexPatterns.get(id),
                stateVal: index,
                stateValFound: !!index && id === index,
              });
            }),
            savedSearch: getServices()
              .getSavedSearchById(savedSearchId)
              .then((savedSearch) => {
                if (savedSearchId) {
                  chrome.recentlyAccessed.add(
                    savedSearch.getFullPath(),
                    savedSearch.title,
                    savedSearchId
                  );
                }
                return savedSearch;
              })
              .catch(
                redirectWhenMissing({
                  history,
                  navigateToApp: core.application.navigateToApp,
                  mapping: {
                    search: '/',
                    'index-pattern': {
                      app: 'management',
                      path: `kibana/objects/savedSearches/${$route.current.params.id}`,
                    },
                  },
                  toastNotifications,
                  onBeforeRedirect() {
                    getUrlTracker().setTrackedUrl('/');
                  },
                })
              ),
          });
        });
      },
    },
  };

  $routeProvider.when('/view/:id?', discoverRoute);
  $routeProvider.when('/', discoverRoute);
});

app.directive('discoverApp', function () {
  return {
    restrict: 'E',
    controllerAs: 'discoverApp',
    controller: discoverController,
  };
});

function discoverController(
  $element,
  $route,
  $scope,
  $timeout,
  $window,
  Promise,
  localStorage,
  uiCapabilities
) {
  const { isDefault: isDefaultType } = indexPatternsUtils;
  const subscriptions = new Subscription();
  const $fetchObservable = new Subject();
  let inspectorRequest;
  const savedSearch = $route.current.locals.savedObjects.savedSearch;
  $scope.searchSource = savedSearch.searchSource;
  $scope.indexPattern = resolveIndexPatternLoading();
  //used for functional testing
  $scope.fetchCounter = 0;

  const getTimeField = () => {
    return isDefaultType($scope.indexPattern) ? $scope.indexPattern.timeFieldName : undefined;
  };

  const history = getHistory();

  const {
    appStateContainer,
    startSync: startStateSync,
    stopSync: stopStateSync,
    setAppState,
    replaceUrlAppState,
    isAppStateDirty,
    kbnUrlStateStorage,
    getPreviousAppState,
    resetInitialAppState,
  } = getState({
    defaultAppState: getStateDefaults(),
    storeInSessionStorage: config.get('state:storeInSessionStorage'),
    history,
  });
  if (appStateContainer.getState().index !== $scope.indexPattern.id) {
    //used index pattern is different than the given by url/state which is invalid
    setAppState({ index: $scope.indexPattern.id });
  }
  $scope.state = { ...appStateContainer.getState() };

  // syncs `_g` portion of url with query services
  const { stop: stopSyncingGlobalStateWithUrl } = syncQueryStateWithUrl(
    data.query,
    kbnUrlStateStorage
  );

  // sync initial app filters from state to filterManager
  filterManager.setAppFilters(_.cloneDeep(appStateContainer.getState().filters));

  const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
    data.query,
    appStateContainer,
    { filters: esFilters.FilterStateStore.APP_STATE }
  );

  const appStateUnsubscribe = appStateContainer.subscribe(async (newState) => {
    const { state: newStatePartial } = splitState(newState);
    const { state: oldStatePartial } = splitState(getPreviousAppState());

    if (!_.isEqual(newStatePartial, oldStatePartial)) {
      $scope.$evalAsync(async () => {
        $scope.state = { ...newState };

        // detect changes that should trigger fetching of new data
        const changes = ['interval', 'sort', 'query'].filter(
          (prop) => !_.isEqual(newStatePartial[prop], oldStatePartial[prop])
        );

        if (changes.length) {
          $fetchObservable.next();
        }
      });
    }
  });

  // this listener is waiting for such a path http://localhost:5601/app/discover#/
  // which could be set through pressing "New" button in top nav or go to "Discover" plugin from the sidebar
  // to reload the page in a right way
  const unlistenHistoryBasePath = history.listen(({ pathname, search, hash }) => {
    if (!search && !hash && pathname === '/') {
      $route.reload();
    }
  });

  $scope.setIndexPattern = async (id) => {
    await replaceUrlAppState({ index: id });
    $route.reload();
  };

  // update data source when filters update
  subscriptions.add(
    subscribeWithScope(
      $scope,
      filterManager.getUpdates$(),
      {
        next: () => {
          $scope.state.filters = filterManager.getAppFilters();
          $scope.updateDataSource();
        },
      },
      (error) => addFatalError(core.fatalErrors, error)
    )
  );

  const inspectorAdapters = {
    requests: new RequestAdapter(),
  };

  $scope.timefilterUpdateHandler = (ranges) => {
    timefilter.setTime({
      from: moment(ranges.from).toISOString(),
      to: moment(ranges.to).toISOString(),
      mode: 'absolute',
    });
  };
  $scope.intervalOptions = search.aggs.intervalOptions;
  $scope.minimumVisibleRows = 50;
  $scope.fetchStatus = fetchStatuses.UNINITIALIZED;
  $scope.showSaveQuery = uiCapabilities.discover.saveQuery;

  $scope.$watch(
    () => uiCapabilities.discover.saveQuery,
    (newCapability) => {
      $scope.showSaveQuery = newCapability;
    }
  );

  let abortController;
  $scope.$on('$destroy', () => {
    if (abortController) abortController.abort();
    savedSearch.destroy();
    subscriptions.unsubscribe();
    appStateUnsubscribe();
    stopStateSync();
    stopSyncingGlobalStateWithUrl();
    stopSyncingQueryAppStateWithStateContainer();
    unlistenHistoryBasePath();
  });

  const getTopNavLinks = () => {
    const newSearch = {
      id: 'new',
      label: i18n.translate('discover.localMenu.localMenu.newSearchTitle', {
        defaultMessage: 'New',
      }),
      description: i18n.translate('discover.localMenu.newSearchDescription', {
        defaultMessage: 'New Search',
      }),
      run: function () {
        $scope.$evalAsync(() => {
          history.push('/');
        });
      },
      testId: 'discoverNewButton',
    };

    const saveSearch = {
      id: 'save',
      label: i18n.translate('discover.localMenu.saveTitle', {
        defaultMessage: 'Save',
      }),
      description: i18n.translate('discover.localMenu.saveSearchDescription', {
        defaultMessage: 'Save Search',
      }),
      testId: 'discoverSaveButton',
      run: async () => {
        const onSave = ({
          newTitle,
          newCopyOnSave,
          isTitleDuplicateConfirmed,
          onTitleDuplicate,
        }) => {
          const currentTitle = savedSearch.title;
          savedSearch.title = newTitle;
          savedSearch.copyOnSave = newCopyOnSave;
          const saveOptions = {
            confirmOverwrite: false,
            isTitleDuplicateConfirmed,
            onTitleDuplicate,
          };
          return saveDataSource(saveOptions).then((response) => {
            // If the save wasn't successful, put the original values back.
            if (!response.id || response.error) {
              savedSearch.title = currentTitle;
            } else {
              resetInitialAppState();
            }
            return response;
          });
        };

        const saveModal = (
          <SavedObjectSaveModal
            onSave={onSave}
            onClose={() => {}}
            title={savedSearch.title}
            showCopyOnSave={!!savedSearch.id}
            objectType="search"
            description={i18n.translate('discover.localMenu.saveSaveSearchDescription', {
              defaultMessage:
                'Save your Discover search so you can use it in visualizations and dashboards',
            })}
            showDescription={false}
          />
        );
        showSaveModal(saveModal, core.i18n.Context);
      },
    };

    const openSearch = {
      id: 'open',
      label: i18n.translate('discover.localMenu.openTitle', {
        defaultMessage: 'Open',
      }),
      description: i18n.translate('discover.localMenu.openSavedSearchDescription', {
        defaultMessage: 'Open Saved Search',
      }),
      testId: 'discoverOpenButton',
      run: () => {
        showOpenSearchPanel({
          makeUrl: (searchId) => `#/view/${encodeURIComponent(searchId)}`,
          I18nContext: core.i18n.Context,
        });
      },
    };

    const shareSearch = {
      id: 'share',
      label: i18n.translate('discover.localMenu.shareTitle', {
        defaultMessage: 'Share',
      }),
      description: i18n.translate('discover.localMenu.shareSearchDescription', {
        defaultMessage: 'Share Search',
      }),
      testId: 'shareTopNavButton',
      run: async (anchorElement) => {
        const sharingData = await this.getSharingData();
        share.toggleShareContextMenu({
          anchorElement,
          allowEmbed: false,
          allowShortUrl: uiCapabilities.discover.createShortUrl,
          shareableUrl: unhashUrl(window.location.href),
          objectId: savedSearch.id,
          objectType: 'search',
          sharingData: {
            ...sharingData,
            title: savedSearch.title,
          },
          isDirty: !savedSearch.id || isAppStateDirty(),
        });
      },
    };

    const inspectSearch = {
      id: 'inspect',
      label: i18n.translate('discover.localMenu.inspectTitle', {
        defaultMessage: 'Inspect',
      }),
      description: i18n.translate('discover.localMenu.openInspectorForSearchDescription', {
        defaultMessage: 'Open Inspector for search',
      }),
      testId: 'openInspectorButton',
      run() {
        getServices().inspector.open(inspectorAdapters, {
          title: savedSearch.title,
        });
      },
    };

    return [
      newSearch,
      ...(uiCapabilities.discover.save ? [saveSearch] : []),
      openSearch,
      shareSearch,
      inspectSearch,
    ];
  };
  $scope.topNavMenu = getTopNavLinks();

  $scope.searchSource
    .setField('index', $scope.indexPattern)
    .setField('highlightAll', true)
    .setField('version', true);

  // Even when searching rollups, we want to use the default strategy so that we get back a
  // document-like response.
  $scope.searchSource.setPreferredSearchStrategyId('default');

  // searchSource which applies time range
  const timeRangeSearchSource = savedSearch.searchSource.create();

  if (isDefaultType($scope.indexPattern)) {
    timeRangeSearchSource.setField('filter', () => {
      return timefilter.createFilter($scope.indexPattern);
    });
  }

  $scope.searchSource.setParent(timeRangeSearchSource);

  const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
  chrome.docTitle.change(`Discover${pageTitleSuffix}`);
  const discoverBreadcrumbsTitle = i18n.translate('discover.discoverBreadcrumbTitle', {
    defaultMessage: 'Discover',
  });

  if (savedSearch.id && savedSearch.title) {
    chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
        href: '#/',
      },
      { text: savedSearch.title },
    ]);
  } else {
    chrome.setBreadcrumbs([
      {
        text: discoverBreadcrumbsTitle,
      },
    ]);
  }

  $scope.screenTitle = savedSearch.title;

  const getFieldCounts = async () => {
    // the field counts aren't set until we have the data back,
    // so we wait for the fetch to be done before proceeding
    if ($scope.fetchStatus === fetchStatuses.COMPLETE) {
      return $scope.fieldCounts;
    }

    return await new Promise((resolve) => {
      const unwatch = $scope.$watch('fetchStatus', (newValue) => {
        if (newValue === fetchStatuses.COMPLETE) {
          unwatch();
          resolve($scope.fieldCounts);
        }
      });
    });
  };

  const getSharingDataFields = async (selectedFields, timeFieldName, hideTimeColumn) => {
    if (selectedFields.length === 1 && selectedFields[0] === '_source') {
      const fieldCounts = await getFieldCounts();
      return {
        searchFields: null,
        selectFields: _.keys(fieldCounts).sort(),
      };
    }

    const fields =
      timeFieldName && !hideTimeColumn ? [timeFieldName, ...selectedFields] : selectedFields;
    return {
      searchFields: fields,
      selectFields: fields,
    };
  };

  this.getSharingData = async () => {
    const searchSource = $scope.searchSource.createCopy();

    const { searchFields, selectFields } = await getSharingDataFields(
      $scope.state.columns,
      $scope.indexPattern.timeFieldName,
      config.get(DOC_HIDE_TIME_COLUMN_SETTING)
    );
    searchSource.setField('fields', searchFields);
    searchSource.setField(
      'sort',
      getSortForSearchSource(
        $scope.state.sort,
        $scope.indexPattern,
        config.get(SORT_DEFAULT_ORDER_SETTING)
      )
    );
    searchSource.setField('highlight', null);
    searchSource.setField('highlightAll', null);
    searchSource.setField('aggs', null);
    searchSource.setField('size', null);

    const body = await searchSource.getSearchRequestBody();
    return {
      searchRequest: {
        index: searchSource.getField('index').title,
        body,
      },
      fields: selectFields,
      metaFields: $scope.indexPattern.metaFields,
      conflictedTypesFields: $scope.indexPattern.fields
        .filter((f) => f.type === 'conflict')
        .map((f) => f.name),
      indexPatternId: searchSource.getField('index').id,
    };
  };

  function getStateDefaults() {
    const query =
      $scope.searchSource.getField('query') ||
      getDefaultQuery(
        localStorage.get('kibana.userQueryLanguage') ||
          config.get(UI_SETTINGS.SEARCH_QUERY_LANGUAGE)
      );
    return {
      query,
      sort: getSortArray(savedSearch.sort, $scope.indexPattern),
      columns:
        savedSearch.columns.length > 0
          ? savedSearch.columns
          : config.get(DEFAULT_COLUMNS_SETTING).slice(),
      index: $scope.indexPattern.id,
      interval: 'auto',
      filters: _.cloneDeep($scope.searchSource.getOwnField('filter')),
    };
  }

  $scope.state.index = $scope.indexPattern.id;
  $scope.state.sort = getSortArray($scope.state.sort, $scope.indexPattern);

  $scope.opts = {
    // number of records to fetch, then paginate through
    sampleSize: config.get(SAMPLE_SIZE_SETTING),
    timefield: getTimeField(),
    savedSearch: savedSearch,
    indexPatternList: $route.current.locals.savedObjects.ip.list,
  };

  const shouldSearchOnPageLoad = () => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      config.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false
    );
  };

  const init = _.once(() => {
    $scope.updateDataSource().then(async () => {
      const searchBarChanges = merge(
        timefilter.getAutoRefreshFetch$(),
        timefilter.getFetch$(),
        filterManager.getFetches$(),
        $fetchObservable
      ).pipe(debounceTime(100));

      subscriptions.add(
        subscribeWithScope(
          $scope,
          searchBarChanges,
          {
            next: $scope.fetch,
          },
          (error) => addFatalError(core.fatalErrors, error)
        )
      );
      subscriptions.add(
        subscribeWithScope(
          $scope,
          timefilter.getTimeUpdate$(),
          {
            next: () => {
              $scope.updateTime();
            },
          },
          (error) => addFatalError(core.fatalErrors, error)
        )
      );

      $scope.changeInterval = (interval) => {
        if (interval) {
          setAppState({ interval });
        }
      };

      $scope.$watchMulti(
        ['rows', 'fetchStatus'],
        (function updateResultState() {
          let prev = {};
          const status = {
            UNINITIALIZED: 'uninitialized',
            LOADING: 'loading', // initial data load
            READY: 'ready', // results came back
            NO_RESULTS: 'none', // no results came back
          };

          function pick(rows, oldRows, fetchStatus) {
            // initial state, pretend we're already loading if we're about to execute a search so
            // that the uninitilized message doesn't flash on screen
            if (rows == null && oldRows == null && shouldSearchOnPageLoad()) {
              return status.LOADING;
            }

            if (fetchStatus === fetchStatuses.UNINITIALIZED) {
              return status.UNINITIALIZED;
            }

            const rowsEmpty = _.isEmpty(rows);
            if (rowsEmpty && fetchStatus === fetchStatuses.LOADING) return status.LOADING;
            else if (!rowsEmpty) return status.READY;
            else return status.NO_RESULTS;
          }

          return function () {
            const current = {
              rows: $scope.rows,
              fetchStatus: $scope.fetchStatus,
            };

            $scope.resultState = pick(
              current.rows,
              prev.rows,
              current.fetchStatus,
              prev.fetchStatus
            );

            prev = current;
          };
        })()
      );

      if (getTimeField()) {
        setupVisualization();
        $scope.updateTime();
      }

      init.complete = true;
      if (shouldSearchOnPageLoad()) {
        $fetchObservable.next();
      }
    });
  });

  async function saveDataSource(saveOptions) {
    await $scope.updateDataSource();

    savedSearch.columns = $scope.state.columns;
    savedSearch.sort = $scope.state.sort;

    try {
      const id = await savedSearch.save(saveOptions);
      $scope.$evalAsync(() => {
        if (id) {
          toastNotifications.addSuccess({
            title: i18n.translate('discover.notifications.savedSearchTitle', {
              defaultMessage: `Search '{savedSearchTitle}' was saved`,
              values: {
                savedSearchTitle: savedSearch.title,
              },
            }),
            'data-test-subj': 'saveSearchSuccess',
          });

          if (savedSearch.id !== $route.current.params.id) {
            history.push(`/view/${encodeURIComponent(savedSearch.id)}`);
          } else {
            // Update defaults so that "reload saved query" functions correctly
            setAppState(getStateDefaults());
            chrome.docTitle.change(savedSearch.lastSavedTitle);
            chrome.setBreadcrumbs([
              {
                text: discoverBreadcrumbsTitle,
                href: '#/',
              },
              { text: savedSearch.title },
            ]);
          }
        }
      });
      return { id };
    } catch (saveError) {
      toastNotifications.addDanger({
        title: i18n.translate('discover.notifications.notSavedSearchTitle', {
          defaultMessage: `Search '{savedSearchTitle}' was not saved.`,
          values: {
            savedSearchTitle: savedSearch.title,
          },
        }),
        text: saveError.message,
      });
      return { error: saveError };
    }
  }

  $scope.opts.fetch = $scope.fetch = function () {
    // ignore requests to fetch before the app inits
    if (!init.complete) return;
    $scope.fetchCounter++;
    $scope.fetchError = undefined;
    if (!validateTimeRange(timefilter.getTime(), toastNotifications)) {
      $scope.resultState = 'none';
      return;
    }

    // Abort any in-progress requests before fetching again
    if (abortController) abortController.abort();
    abortController = new AbortController();

    $scope
      .updateDataSource()
      .then(setupVisualization)
      .then(function () {
        $scope.fetchStatus = fetchStatuses.LOADING;
        logInspectorRequest();
        return $scope.searchSource.fetch({
          abortSignal: abortController.signal,
        });
      })
      .then(onResults)
      .catch((error) => {
        // If the request was aborted then no need to surface this error in the UI
        if (error instanceof Error && error.name === 'AbortError') return;

        const fetchError = getPainlessError(error);

        if (fetchError) {
          $scope.fetchError = fetchError;
        } else {
          toastNotifications.addError(error, {
            title: i18n.translate('discover.errorLoadingData', {
              defaultMessage: 'Error loading data',
            }),
            toastMessage: error.shortMessage || error.body?.message,
          });
        }
      });
  };

  $scope.updateQuery = function ({ query }, isUpdate = true) {
    if (!_.isEqual(query, appStateContainer.getState().query) || isUpdate === false) {
      setAppState({ query });
      $fetchObservable.next();
    }
  };

  $scope.updateSavedQueryId = (newSavedQueryId) => {
    if (newSavedQueryId) {
      setAppState({ savedQuery: newSavedQueryId });
    } else {
      // remove savedQueryId from state
      const state = {
        ...appStateContainer.getState(),
      };
      delete state.savedQuery;
      appStateContainer.set(state);
    }
  };

  function getDimensions(aggs, timeRange) {
    const [metric, agg] = aggs;
    agg.params.timeRange = timeRange;
    const bounds = agg.params.timeRange ? timefilter.calculateBounds(agg.params.timeRange) : null;
    agg.buckets.setBounds(bounds);

    const { esUnit, esValue } = agg.buckets.getInterval();
    return {
      x: {
        accessor: 0,
        label: agg.makeLabel(),
        format: agg.toSerializedFieldFormat(),
        params: {
          date: true,
          interval: moment.duration(esValue, esUnit),
          intervalESValue: esValue,
          intervalESUnit: esUnit,
          format: agg.buckets.getScaledDateFormat(),
          bounds: agg.buckets.getBounds(),
        },
      },
      y: {
        accessor: 1,
        format: metric.toSerializedFieldFormat(),
        label: metric.makeLabel(),
      },
    };
  }

  function onResults(resp) {
    inspectorRequest.stats(getResponseInspectorStats($scope.searchSource, resp)).ok({ json: resp });

    if (getTimeField()) {
      const tabifiedData = tabifyAggResponse($scope.vis.data.aggs, resp);
      $scope.searchSource.rawResponse = resp;
      $scope.histogramData = discoverResponseHandler(
        tabifiedData,
        getDimensions($scope.vis.data.aggs.aggs, $scope.timeRange)
      );
      if ($scope.vis.data.aggs.aggs[1]) {
        $scope.bucketInterval = $scope.vis.data.aggs.aggs[1].buckets.getInterval();
      }
      $scope.updateTime();
    }

    $scope.hits = resp.hits.total;
    $scope.rows = resp.hits.hits;

    // if we haven't counted yet, reset the counts
    const counts = ($scope.fieldCounts = $scope.fieldCounts || {});

    $scope.rows.forEach((hit) => {
      const fields = Object.keys($scope.indexPattern.flattenHit(hit));
      fields.forEach((fieldName) => {
        counts[fieldName] = (counts[fieldName] || 0) + 1;
      });
    });

    $scope.fetchStatus = fetchStatuses.COMPLETE;
  }

  function logInspectorRequest() {
    inspectorAdapters.requests.reset();
    const title = i18n.translate('discover.inspectorRequestDataTitle', {
      defaultMessage: 'data',
    });
    const description = i18n.translate('discover.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });
    inspectorRequest = inspectorAdapters.requests.start(title, { description });
    inspectorRequest.stats(getRequestInspectorStats($scope.searchSource));
    $scope.searchSource.getSearchRequestBody().then((body) => {
      inspectorRequest.json(body);
    });
  }

  $scope.updateTime = function () {
    const { from, to } = timefilter.getTime();
    // this is the timerange for the histogram, should be refactored
    $scope.timeRange = {
      from: dateMath.parse(from),
      to: dateMath.parse(to, { roundUp: true }),
    };
  };

  $scope.toMoment = function (datetime) {
    if (!datetime) {
      return;
    }
    return moment(datetime).format(config.get('dateFormat'));
  };

  $scope.resetQuery = function () {
    history.push(
      $route.current.params.id ? `/view/${encodeURIComponent($route.current.params.id)}` : '/'
    );
    $route.reload();
  };

  $scope.onSkipBottomButtonClick = function () {
    // show all the Rows
    $scope.minimumVisibleRows = $scope.hits;

    // delay scrolling to after the rows have been rendered
    const bottomMarker = $element.find('#discoverBottomMarker');
    $timeout(() => {
      bottomMarker.focus();
      // The anchor tag is not technically empty (it's a hack to make Safari scroll)
      // so the browser will show a highlight: remove the focus once scrolled
      $timeout(() => {
        bottomMarker.blur();
      }, 0);
    }, 0);
  };

  $scope.newQuery = function () {
    history.push('/');
  };

  $scope.updateDataSource = () => {
    const { indexPattern, searchSource } = $scope;
    searchSource
      .setField('index', $scope.indexPattern)
      .setField('size', $scope.opts.sampleSize)
      .setField(
        'sort',
        getSortForSearchSource(
          $scope.state.sort,
          indexPattern,
          config.get(SORT_DEFAULT_ORDER_SETTING)
        )
      )
      .setField('query', $scope.state.query || null)
      .setField('filter', filterManager.getFilters());
    return Promise.resolve();
  };

  $scope.setSortOrder = function setSortOrder(sort) {
    setAppState({ sort });
  };

  // TODO: On array fields, negating does not negate the combination, rather all terms
  $scope.filterQuery = function (field, values, operation) {
    $scope.indexPattern.popularizeField(field, 1);
    const newFilters = esFilters.generateFilters(
      filterManager,
      field,
      values,
      operation,
      $scope.indexPattern.id
    );
    return filterManager.addFilters(newFilters);
  };

  $scope.addColumn = function addColumn(columnName) {
    if (uiCapabilities.discover.save) {
      $scope.indexPattern.popularizeField(columnName, 1);
    }
    const columns = columnActions.addColumn($scope.state.columns, columnName);
    setAppState({ columns });
  };

  $scope.removeColumn = function removeColumn(columnName) {
    if (uiCapabilities.discover.save) {
      $scope.indexPattern.popularizeField(columnName, 1);
    }
    const columns = columnActions.removeColumn($scope.state.columns, columnName);
    // The state's sort property is an array of [sortByColumn,sortDirection]
    const sort = $scope.state.sort.length
      ? $scope.state.sort.filter((subArr) => subArr[0] !== columnName)
      : [];
    setAppState({ columns, sort });
  };

  $scope.moveColumn = function moveColumn(columnName, newIndex) {
    const columns = columnActions.moveColumn($scope.state.columns, columnName, newIndex);
    setAppState({ columns });
  };

  $scope.scrollToTop = function () {
    $window.scrollTo(0, 0);
  };

  async function setupVisualization() {
    // If no timefield has been specified we don't create a histogram of messages
    if (!getTimeField()) return;
    const { interval: histogramInterval } = $scope.state;

    const visStateAggs = [
      {
        type: 'count',
        schema: 'metric',
      },
      {
        type: 'date_histogram',
        schema: 'segment',
        params: {
          field: getTimeField(),
          interval: histogramInterval,
          timeRange: timefilter.getTime(),
        },
      },
    ];

    $scope.vis = await visualizations.createVis('histogram', {
      title: savedSearch.title,
      params: {
        addLegend: false,
        addTimeMarker: true,
      },
      data: {
        aggs: visStateAggs,
        searchSource: $scope.searchSource.getSerializedFields(),
      },
    });

    $scope.searchSource.onRequestStart((searchSource, options) => {
      if (!$scope.vis) return;
      return $scope.vis.data.aggs.onSearchRequestStart(searchSource, options);
    });

    $scope.searchSource.setField('aggs', function () {
      if (!$scope.vis) return;
      return $scope.vis.data.aggs.toDsl();
    });
  }

  function getIndexPatternWarning(index) {
    return i18n.translate('discover.valueIsNotConfiguredIndexPatternIDWarningTitle', {
      defaultMessage: '{stateVal} is not a configured index pattern ID',
      values: {
        stateVal: `"${index}"`,
      },
    });
  }

  function resolveIndexPatternLoading() {
    const {
      loaded: loadedIndexPattern,
      stateVal,
      stateValFound,
    } = $route.current.locals.savedObjects.ip;

    const ownIndexPattern = $scope.searchSource.getOwnField('index');

    if (ownIndexPattern && !stateVal) {
      return ownIndexPattern;
    }

    if (stateVal && !stateValFound) {
      const warningTitle = getIndexPatternWarning();

      if (ownIndexPattern) {
        toastNotifications.addWarning({
          title: warningTitle,
          text: i18n.translate('discover.showingSavedIndexPatternWarningDescription', {
            defaultMessage:
              'Showing the saved index pattern: "{ownIndexPatternTitle}" ({ownIndexPatternId})',
            values: {
              ownIndexPatternTitle: ownIndexPattern.title,
              ownIndexPatternId: ownIndexPattern.id,
            },
          }),
        });
        return ownIndexPattern;
      }

      toastNotifications.addWarning({
        title: warningTitle,
        text: i18n.translate('discover.showingDefaultIndexPatternWarningDescription', {
          defaultMessage:
            'Showing the default index pattern: "{loadedIndexPatternTitle}" ({loadedIndexPatternId})',
          values: {
            loadedIndexPatternTitle: loadedIndexPattern.title,
            loadedIndexPatternId: loadedIndexPattern.id,
          },
        }),
      });
    }

    return loadedIndexPattern;
  }

  addHelpMenuToAppChrome(chrome);

  init();
  // Propagate current app state to url, then start syncing
  replaceUrlAppState().then(() => startStateSync());
}
