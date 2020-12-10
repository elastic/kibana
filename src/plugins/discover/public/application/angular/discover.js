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
import { merge, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import moment from 'moment';
import dateMath from '@elastic/datemath';
import { i18n } from '@kbn/i18n';
import { createSearchSessionRestorationDataProvider, getState, splitState } from './discover_state';

import { RequestAdapter } from '../../../../inspector/public';
import {
  connectToQueryState,
  esFilters,
  indexPatterns as indexPatternsUtils,
  syncQueryStateWithUrl,
} from '../../../../data/public';
import { getSortArray } from './doc_table';
import * as columnActions from './doc_table/actions/columns';
import indexTemplateLegacy from './discover_legacy.html';
import { addHelpMenuToAppChrome } from '../components/help_menu/help_menu_util';
import { discoverResponseHandler } from './response_handler';
import {
  getAngularModule,
  getHeaderActionMenuMounter,
  getRequestInspectorStats,
  getResponseInspectorStats,
  getServices,
  getUrlTracker,
  redirectWhenMissing,
  subscribeWithScope,
  tabifyAggResponse,
} from '../../kibana_services';
import {
  getRootBreadcrumbs,
  getSavedSearchBreadcrumbs,
  setBreadcrumbsTitle,
} from '../helpers/breadcrumbs';
import { validateTimeRange } from '../helpers/validate_time_range';
import { popularizeField } from '../helpers/popularize_field';
import { getSwitchIndexPatternAppState } from '../helpers/get_switch_index_pattern_app_state';
import { addFatalError } from '../../../../kibana_legacy/public';
import { METRIC_TYPE } from '@kbn/analytics';
import { SEARCH_SESSION_ID_QUERY_PARAM } from '../../url_generator';
import { getQueryParams, removeQueryParam } from '../../../../kibana_utils/public';
import {
  DEFAULT_COLUMNS_SETTING,
  MODIFY_COLUMNS_ON_SWITCH,
  SAMPLE_SIZE_SETTING,
  SEARCH_ON_PAGE_LOAD_SETTING,
} from '../../../common';
import { loadIndexPattern, resolveIndexPattern } from '../helpers/resolve_index_pattern';
import { getTopNavLinks } from '../components/top_nav/get_top_nav_links';
import { updateSearchSource } from '../helpers/update_search_source';
import { calcFieldCounts } from '../helpers/calc_field_counts';

const services = getServices();

const {
  core,
  chrome,
  data,
  history: getHistory,
  indexPatterns,
  filterManager,
  timefilter,
  toastNotifications,
  uiSettings: config,
  trackUiMetric,
} = getServices();

const fetchStatuses = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading',
  COMPLETE: 'complete',
  ERROR: 'error',
};

const getSearchSessionIdFromURL = (history) =>
  getQueryParams(history.location)[SEARCH_SESSION_ID_QUERY_PARAM];

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
    template: indexTemplateLegacy,
    reloadOnSearch: false,
    resolve: {
      savedObjects: function ($route, Promise) {
        const history = getHistory();
        const savedSearchId = $route.current.params.id;
        return data.indexPatterns.ensureDefaultIndexPattern(history).then(() => {
          const { appStateContainer } = getState({ history });
          const { index } = appStateContainer.getState();
          return Promise.props({
            ip: loadIndexPattern(index, data.indexPatterns, config),
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

function discoverController($element, $route, $scope, $timeout, Promise, uiCapabilities) {
  const { isDefault: isDefaultType } = indexPatternsUtils;
  const subscriptions = new Subscription();
  const refetch$ = new Subject();
  let inspectorRequest;
  const savedSearch = $route.current.locals.savedObjects.savedSearch;
  $scope.searchSource = savedSearch.searchSource;
  $scope.indexPattern = resolveIndexPattern(
    $route.current.locals.savedObjects.ip,
    $scope.searchSource,
    toastNotifications
  );
  //used for functional testing
  $scope.fetchCounter = 0;

  const getTimeField = () => {
    return isDefaultType($scope.indexPattern) ? $scope.indexPattern.timeFieldName : undefined;
  };

  const history = getHistory();
  // used for restoring background session
  let isInitialSearch = true;

  // search session requested a data refresh
  subscriptions.add(
    data.search.session.onRefresh$.subscribe(() => {
      refetch$.next();
    })
  );

  const state = getState({
    getStateDefaults,
    storeInSessionStorage: config.get('state:storeInSessionStorage'),
    history,
    toasts: core.notifications.toasts,
  });

  const {
    appStateContainer,
    startSync: startStateSync,
    stopSync: stopStateSync,
    setAppState,
    replaceUrlAppState,
    kbnUrlStateStorage,
    getPreviousAppState,
  } = state;

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
  data.query.queryString.setQuery(appStateContainer.getState().query);

  const stopSyncingQueryAppStateWithStateContainer = connectToQueryState(
    data.query,
    appStateContainer,
    {
      filters: esFilters.FilterStateStore.APP_STATE,
      query: true,
    }
  );

  const appStateUnsubscribe = appStateContainer.subscribe(async (newState) => {
    const { state: newStatePartial } = splitState(newState);
    const { state: oldStatePartial } = splitState(getPreviousAppState());

    if (!_.isEqual(newStatePartial, oldStatePartial)) {
      $scope.$evalAsync(async () => {
        if (oldStatePartial.index !== newStatePartial.index) {
          //in case of index pattern switch the route has currently to be reloaded, legacy
          $route.reload();
          return;
        }

        $scope.state = { ...newState };

        // detect changes that should trigger fetching of new data
        const changes = ['interval', 'sort'].filter(
          (prop) => !_.isEqual(newStatePartial[prop], oldStatePartial[prop])
        );

        if (changes.length) {
          refetch$.next();
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

  data.search.session.setSearchSessionInfoProvider(
    createSearchSessionRestorationDataProvider({
      appStateContainer,
      data,
      getSavedSearchId: () => savedSearch.id,
    })
  );

  $scope.setIndexPattern = async (id) => {
    const nextIndexPattern = await indexPatterns.get(id);
    if (nextIndexPattern) {
      const nextAppState = getSwitchIndexPatternAppState(
        $scope.indexPattern,
        nextIndexPattern,
        $scope.state.columns,
        $scope.state.sort,
        config.get(MODIFY_COLUMNS_ON_SWITCH)
      );
      await setAppState(nextAppState);
    }
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
  $scope.minimumVisibleRows = 50;
  $scope.fetchStatus = fetchStatuses.UNINITIALIZED;
  $scope.showSaveQuery = uiCapabilities.discover.saveQuery;

  let abortController;
  $scope.$on('$destroy', () => {
    if (abortController) abortController.abort();
    savedSearch.destroy();
    subscriptions.unsubscribe();
    data.search.session.clear();
    appStateUnsubscribe();
    stopStateSync();
    stopSyncingGlobalStateWithUrl();
    stopSyncingQueryAppStateWithStateContainer();
    unlistenHistoryBasePath();
  });

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

  $scope.topNavMenu = getTopNavLinks({
    getFieldCounts,
    indexPattern: $scope.indexPattern,
    inspectorAdapters,
    navigateTo: (path) => {
      $scope.$evalAsync(() => {
        history.push(path);
      });
    },
    savedSearch,
    services,
    state,
  });

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

  setBreadcrumbsTitle(savedSearch, chrome);

  function getStateDefaults() {
    const query = $scope.searchSource.getField('query') || data.query.queryString.getDefaultQuery();
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
    config: config,
    setHeaderActionMenu: getHeaderActionMenuMounter(),
    data,
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
      const fetch$ = merge(
        refetch$,
        filterManager.getFetches$(),
        timefilter.getFetch$(),
        timefilter.getAutoRefreshFetch$(),
        data.query.queryString.getUpdates$()
      ).pipe(debounceTime(100));

      subscriptions.add(
        subscribeWithScope(
          $scope,
          fetch$,
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
            if (!$scope.fetchError && rows == null && oldRows == null && shouldSearchOnPageLoad()) {
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
        refetch$.next();
      }
    });
  });

  $scope.opts.fetch = $scope.fetch = function () {
    // ignore requests to fetch before the app inits
    if (!init.complete) return;
    $scope.fetchCounter++;
    $scope.fetchError = undefined;
    $scope.minimumVisibleRows = 50;
    if (!validateTimeRange(timefilter.getTime(), toastNotifications)) {
      $scope.resultState = 'none';
      return;
    }

    // Abort any in-progress requests before fetching again
    if (abortController) abortController.abort();
    abortController = new AbortController();

    const searchSessionId = (() => {
      const searchSessionIdFromURL = getSearchSessionIdFromURL(history);
      if (searchSessionIdFromURL) {
        if (isInitialSearch) {
          data.search.session.restore(searchSessionIdFromURL);
          isInitialSearch = false;
          return searchSessionIdFromURL;
        } else {
          // navigating away from background search
          removeQueryParam(history, SEARCH_SESSION_ID_QUERY_PARAM);
        }
      }
      return data.search.session.start();
    })();

    $scope
      .updateDataSource()
      .then(setupVisualization)
      .then(function () {
        $scope.fetchStatus = fetchStatuses.LOADING;
        logInspectorRequest({ searchSessionId });
        return $scope.searchSource.fetch({
          abortSignal: abortController.signal,
          sessionId: searchSessionId,
        });
      })
      .then(onResults)
      .catch((error) => {
        // If the request was aborted then no need to surface this error in the UI
        if (error instanceof Error && error.name === 'AbortError') return;

        $scope.fetchStatus = fetchStatuses.NO_RESULTS;
        $scope.fetchError = error;

        data.search.showError(error);
      });
  };

  $scope.handleRefresh = function (_payload, isUpdate) {
    if (isUpdate === false) {
      refetch$.next();
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
    inspectorRequest.stats(getResponseInspectorStats(resp, $scope.searchSource)).ok({ json: resp });

    if (getTimeField()) {
      const tabifiedData = tabifyAggResponse($scope.opts.chartAggConfigs, resp);
      $scope.searchSource.rawResponse = resp;
      $scope.histogramData = discoverResponseHandler(
        tabifiedData,
        getDimensions($scope.opts.chartAggConfigs.aggs, $scope.timeRange)
      );
      $scope.updateTime();
    }

    $scope.hits = resp.hits.total;
    $scope.rows = resp.hits.hits;

    $scope.fieldCounts = calcFieldCounts(
      $scope.fieldCounts || {},
      resp.hits.hits,
      $scope.indexPattern
    );
    $scope.fetchStatus = fetchStatuses.COMPLETE;
  }

  function logInspectorRequest({ searchSessionId = null } = { searchSessionId: null }) {
    inspectorAdapters.requests.reset();
    const title = i18n.translate('discover.inspectorRequestDataTitle', {
      defaultMessage: 'data',
    });
    const description = i18n.translate('discover.inspectorRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
    });
    inspectorRequest = inspectorAdapters.requests.start(title, { description, searchSessionId });
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
    updateSearchSource($scope.searchSource, {
      indexPattern: $scope.indexPattern,
      services,
      sort: $scope.state.sort,
    });
    return Promise.resolve();
  };

  $scope.setSortOrder = function setSortOrder(sort) {
    setAppState({ sort });
  };

  // TODO: On array fields, negating does not negate the combination, rather all terms
  $scope.filterQuery = function (field, values, operation) {
    const { indexPattern } = $scope;

    popularizeField(indexPattern, field.name, indexPatterns);
    const newFilters = esFilters.generateFilters(
      filterManager,
      field,
      values,
      operation,
      $scope.indexPattern.id
    );
    if (trackUiMetric) {
      trackUiMetric(METRIC_TYPE.CLICK, 'filter_added');
    }
    return filterManager.addFilters(newFilters);
  };

  $scope.addColumn = function addColumn(columnName) {
    if (uiCapabilities.discover.save) {
      const { indexPattern } = $scope;
      popularizeField(indexPattern, columnName, indexPatterns);
    }
    const columns = columnActions.addColumn($scope.state.columns, columnName);
    setAppState({ columns });
  };

  $scope.removeColumn = function removeColumn(columnName) {
    if (uiCapabilities.discover.save) {
      const { indexPattern } = $scope;
      popularizeField(indexPattern, columnName, indexPatterns);
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
    $scope.opts.chartAggConfigs = data.search.aggs.createAggConfigs(
      $scope.indexPattern,
      visStateAggs
    );

    $scope.searchSource.onRequestStart((searchSource, options) => {
      if (!$scope.opts.chartAggConfigs) return;
      return $scope.opts.chartAggConfigs.onSearchRequestStart(searchSource, options);
    });

    $scope.searchSource.setField('aggs', function () {
      if (!$scope.opts.chartAggConfigs) return;
      return $scope.opts.chartAggConfigs.toDsl();
    });
  }

  addHelpMenuToAppChrome(chrome);

  init();
  // Propagate current app state to url, then start syncing
  replaceUrlAppState().then(() => startStateSync());
}
