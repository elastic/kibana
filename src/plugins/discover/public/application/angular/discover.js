/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  noSearchSessionStorageCapabilityMessage,
  syncQueryStateWithUrl,
} from '../../../../data/public';
import { getSortArray } from './doc_table';
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
import { addFatalError } from '../../../../kibana_legacy/public';
import {
  DEFAULT_COLUMNS_SETTING,
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../common';
import { loadIndexPattern, resolveIndexPattern } from '../helpers/resolve_index_pattern';
import { updateSearchSource } from '../helpers/update_search_source';
import { calcFieldCounts } from '../helpers/calc_field_counts';
import { getDefaultSort } from './doc_table/lib/get_default_sort';
import { DiscoverSearchSessionManager } from './discover_search_session';

const services = getServices();

const {
  core,
  capabilities,
  chrome,
  data,
  history: getHistory,
  filterManager,
  timefilter,
  toastNotifications,
  uiSettings: config,
} = getServices();

const fetchStatuses = {
  UNINITIALIZED: 'uninitialized',
  LOADING: 'loading',
  COMPLETE: 'complete',
  ERROR: 'error',
};

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

function discoverController($route, $scope, Promise) {
  const { isDefault: isDefaultType } = indexPatternsUtils;
  const subscriptions = new Subscription();
  const refetch$ = new Subject();

  let inspectorRequest;
  let isChangingIndexPattern = false;
  const savedSearch = $route.current.locals.savedObjects.savedSearch;
  const persistentSearchSource = savedSearch.searchSource;
  $scope.indexPattern = resolveIndexPattern(
    $route.current.locals.savedObjects.ip,
    persistentSearchSource,
    toastNotifications
  );
  $scope.useNewFieldsApi = !config.get(SEARCH_FIELDS_FROM_SOURCE);

  //used for functional testing
  $scope.fetchCounter = 0;

  const getTimeField = () => {
    return isDefaultType($scope.indexPattern) ? $scope.indexPattern.timeFieldName : undefined;
  };

  const history = getHistory();
  const searchSessionManager = new DiscoverSearchSessionManager({
    history,
    session: data.search.session,
  });

  const stateContainer = getState({
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
  } = stateContainer;

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
          isChangingIndexPattern = true;
          $route.reload();
          return;
        }

        $scope.state = { ...newState };

        // detect changes that should trigger fetching of new data
        const changes = ['interval', 'sort'].filter(
          (prop) => !_.isEqual(newStatePartial[prop], oldStatePartial[prop])
        );

        if (oldStatePartial.hideChart && !newStatePartial.hideChart) {
          // in case the histogram is hidden, no data is requested
          // so when changing this state data needs to be fetched
          changes.push(true);
        }

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

  data.search.session.enableStorage(
    createSearchSessionRestorationDataProvider({
      appStateContainer,
      data,
      getSavedSearch: () => savedSearch,
    }),
    {
      isDisabled: () =>
        capabilities.discover.storeSearchSession
          ? { disabled: false }
          : {
              disabled: true,
              reasonText: noSearchSessionStorageCapabilityMessage,
            },
    }
  );

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

  $scope.opts = {
    // number of records to fetch, then paginate through
    sampleSize: config.get(SAMPLE_SIZE_SETTING),
    timefield: getTimeField(),
    savedSearch: savedSearch,
    services,
    indexPatternList: $route.current.locals.savedObjects.ip.list,
    config: config,
    setHeaderActionMenu: getHeaderActionMenuMounter(),
    filterManager,
    setAppState,
    data,
    stateContainer,
    searchSessionManager,
    refetch$,
  };

  const inspectorAdapters = ($scope.opts.inspectorAdapters = {
    requests: new RequestAdapter(),
  });

  $scope.minimumVisibleRows = 50;
  $scope.fetchStatus = fetchStatuses.UNINITIALIZED;

  let abortController;
  $scope.$on('$destroy', () => {
    if (abortController) abortController.abort();
    savedSearch.destroy();
    subscriptions.unsubscribe();
    if (!isChangingIndexPattern) {
      // HACK:
      // do not clear session when changing index pattern due to how state management around it is setup
      // it will be cleared by searchSessionManager on controller reload instead
      data.search.session.clear();
    }
    appStateUnsubscribe();
    stopStateSync();
    stopSyncingGlobalStateWithUrl();
    stopSyncingQueryAppStateWithStateContainer();
    unlistenHistoryBasePath();
  });

  $scope.opts.getFieldCounts = async () => {
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
  $scope.opts.navigateTo = (path) => {
    $scope.$evalAsync(() => {
      history.push(path);
    });
  };

  persistentSearchSource.setField('index', $scope.indexPattern);

  // searchSource which applies time range
  const volatileSearchSource = savedSearch.searchSource.create();

  if (isDefaultType($scope.indexPattern)) {
    volatileSearchSource.setField('filter', () => {
      return timefilter.createFilter($scope.indexPattern);
    });
  }

  volatileSearchSource.setParent(persistentSearchSource);
  $scope.volatileSearchSource = volatileSearchSource;

  const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
  chrome.docTitle.change(`Discover${pageTitleSuffix}`);

  setBreadcrumbsTitle(savedSearch, chrome);

  function getDefaultColumns() {
    if (savedSearch.columns.length > 0) {
      return [...savedSearch.columns];
    }
    return [...config.get(DEFAULT_COLUMNS_SETTING)];
  }

  function getStateDefaults() {
    const query =
      persistentSearchSource.getField('query') || data.query.queryString.getDefaultQuery();
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
      filters: _.cloneDeep(persistentSearchSource.getOwnField('filter')),
    };
    if (savedSearch.grid) {
      defaultState.grid = savedSearch.grid;
    }
    if (savedSearch.hideChart) {
      defaultState.hideChart = savedSearch.hideChart;
    }

    return defaultState;
  }

  $scope.state.index = $scope.indexPattern.id;
  $scope.state.sort = getSortArray($scope.state.sort, $scope.indexPattern);

  const shouldSearchOnPageLoad = () => {
    // A saved search is created on every page load, so we check the ID to see if we're loading a
    // previously saved search or if it is just transient
    return (
      config.get(SEARCH_ON_PAGE_LOAD_SETTING) ||
      savedSearch.id !== undefined ||
      timefilter.getRefreshInterval().pause === false ||
      searchSessionManager.hasSearchSessionIdInURL()
    );
  };

  const init = _.once(() => {
    $scope.updateDataSource().then(async () => {
      const fetch$ = merge(
        refetch$,
        filterManager.getFetches$(),
        timefilter.getFetch$(),
        timefilter.getAutoRefreshFetch$(),
        data.query.queryString.getUpdates$(),
        searchSessionManager.newSearchSessionIdFromURL$
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

    const searchSessionId = searchSessionManager.getNextSearchSessionId();

    $scope
      .updateDataSource()
      .then(setupVisualization)
      .then(function () {
        $scope.fetchStatus = fetchStatuses.LOADING;
        logInspectorRequest({ searchSessionId });
        return $scope.volatileSearchSource.fetch({
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
    inspectorRequest
      .stats(getResponseInspectorStats(resp, $scope.volatileSearchSource))
      .ok({ json: resp });

    if (getTimeField() && !$scope.state.hideChart) {
      const tabifiedData = tabifyAggResponse($scope.opts.chartAggConfigs, resp);
      $scope.volatileSearchSource.rawResponse = resp;
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
    inspectorRequest.stats(getRequestInspectorStats($scope.volatileSearchSource));
    $scope.volatileSearchSource.getSearchRequestBody().then((body) => {
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

  $scope.onSkipBottomButtonClick = async () => {
    // show all the Rows
    $scope.minimumVisibleRows = $scope.hits;

    // delay scrolling to after the rows have been rendered
    const bottomMarker = document.getElementById('discoverBottomMarker');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    while ($scope.rows.length !== document.getElementsByClassName('kbnDocTable__row').length) {
      await wait(50);
    }
    bottomMarker.focus();
    await wait(50);
    bottomMarker.blur();
  };

  $scope.newQuery = function () {
    history.push('/');
  };

  const showUnmappedFieldsDefaultValue = $scope.useNewFieldsApi && !!$scope.opts.savedSearch.pre712;
  let showUnmappedFields = showUnmappedFieldsDefaultValue;

  const onChangeUnmappedFields = (value) => {
    showUnmappedFields = value;
    $scope.unmappedFieldsConfig.showUnmappedFields = value;
    $scope.fetch();
  };

  $scope.unmappedFieldsConfig = {
    showUnmappedFieldsDefaultValue,
    showUnmappedFields,
    onChangeUnmappedFields,
  };

  $scope.updateDataSource = () => {
    const { indexPattern, useNewFieldsApi } = $scope;
    const { columns, sort } = $scope.state;
    updateSearchSource({
      persistentSearchSource,
      volatileSearchSource: $scope.volatileSearchSource,
      indexPattern,
      services,
      sort,
      columns,
      useNewFieldsApi,
      showUnmappedFields,
    });
    return Promise.resolve();
  };

  async function setupVisualization() {
    // If no timefield has been specified we don't create a histogram of messages
    if (!getTimeField() || $scope.state.hideChart) return;
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

    $scope.volatileSearchSource.onRequestStart((searchSource, options) => {
      if (!$scope.opts.chartAggConfigs) return;
      return $scope.opts.chartAggConfigs.onSearchRequestStart(searchSource, options);
    });

    $scope.volatileSearchSource.setField('aggs', function () {
      if (!$scope.opts.chartAggConfigs) return;
      return $scope.opts.chartAggConfigs.toDsl();
    });
  }

  addHelpMenuToAppChrome(chrome);

  init();
  // Propagate current app state to url, then start syncing
  replaceUrlAppState().then(() => startStateSync());
}
