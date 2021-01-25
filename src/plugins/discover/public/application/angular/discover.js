/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
import indexTemplateGrid from './discover_datagrid.html';
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
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../common';
import { loadIndexPattern, resolveIndexPattern } from '../helpers/resolve_index_pattern';
import { getTopNavLinks } from '../components/top_nav/get_top_nav_links';
import { updateSearchSource } from '../helpers/update_search_source';
import { calcFieldCounts } from '../helpers/calc_field_counts';
import { getDefaultSort } from './doc_table/lib/get_default_sort';

const services = getServices();

const {
  core,
  capabilities,
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
    badge: () => {
      if (capabilities.discover.save) {
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
    template: getServices().uiSettings.get('doc_table:legacy', true)
      ? indexTemplateLegacy
      : indexTemplateGrid,
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

function discoverController($element, $route, $scope, $timeout, Promise) {
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
  $scope.useNewFieldsApi = !config.get(SEARCH_FIELDS_FROM_SOURCE);

  //used for functional testing
  $scope.fetchCounter = 0;

  const getTimeField = () => {
    return isDefaultType($scope.indexPattern) ? $scope.indexPattern.timeFieldName : undefined;
  };

  const history = getHistory();
  // used for restoring a search session
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
      getSavedSearch: () => savedSearch,
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
        config.get(MODIFY_COLUMNS_ON_SWITCH),
        $scope.useNewFieldsApi
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
  $scope.showSaveQuery = capabilities.discover.saveQuery;
  $scope.showTimeCol =
    !config.get('doc_table:hideTimeColumn', false) && $scope.indexPattern.timeFieldName;

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

  function removeSourceFromColumns(columns) {
    return columns.filter((col) => col !== '_source');
  }

  function getDefaultColumns() {
    const columns = [...savedSearch.columns];

    if ($scope.useNewFieldsApi) {
      return removeSourceFromColumns(columns);
    }
    if (columns.length > 0) {
      return columns;
    }
    return [...config.get(DEFAULT_COLUMNS_SETTING)];
  }

  function getStateDefaults() {
    const query = $scope.searchSource.getField('query') || data.query.queryString.getDefaultQuery();
    const sort = getSortArray(savedSearch.sort, $scope.indexPattern);
    const columns = getDefaultColumns();

    const defaultState = {
      query,
      sort: !sort.length
        ? getDefaultSort($scope.indexPattern, config.get(SORT_DEFAULT_ORDER_SETTING, 'desc'))
        : sort,
      columns,
      index: $scope.indexPattern.id,
      interval: 'auto',
      filters: _.cloneDeep($scope.searchSource.getOwnField('filter')),
    };
    if (savedSearch.grid) {
      defaultState.grid = savedSearch.grid;
    }

    return defaultState;
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
    filterManager,
    setAppState,
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
    const { indexPattern, searchSource, useNewFieldsApi } = $scope;
    const { columns, sort } = $scope.state;
    updateSearchSource(searchSource, {
      indexPattern,
      services,
      sort,
      columns,
      useNewFieldsApi,
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
    const { indexPattern, useNewFieldsApi } = $scope;
    if (capabilities.discover.save) {
      popularizeField(indexPattern, columnName, indexPatterns);
    }
    const columns = columnActions.addColumn($scope.state.columns, columnName, useNewFieldsApi);
    setAppState({ columns });
  };

  $scope.removeColumn = function removeColumn(columnName) {
    const { indexPattern, useNewFieldsApi } = $scope;
    if (capabilities.discover.save) {
      popularizeField(indexPattern, columnName, indexPatterns);
    }
    const columns = columnActions.removeColumn($scope.state.columns, columnName, useNewFieldsApi);
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

  $scope.setColumns = function setColumns(columns) {
    // remove first element of columns if it's the configured timeFieldName, which is prepended automatically
    const actualColumns =
      $scope.indexPattern.timeFieldName && $scope.indexPattern.timeFieldName === columns[0]
        ? columns.slice(1)
        : columns;
    $scope.state = { ...$scope.state, columns: actualColumns };
    setAppState({ columns: actualColumns });
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
