/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { merge, Subject, Subscription } from 'rxjs';
import { debounceTime, tap, filter } from 'rxjs/operators';
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
import { discoverResponseHandler } from './response_handler';
import {
  getAngularModule,
  getHeaderActionMenuMounter,
  getServices,
  getUrlTracker,
  redirectWhenMissing,
  subscribeWithScope,
  tabifyAggResponse,
} from '../../kibana_services';
import { getRootBreadcrumbs, getSavedSearchBreadcrumbs } from '../helpers/breadcrumbs';
import { getStateDefaults } from '../helpers/get_state_defaults';
import { getResultState } from '../helpers/get_result_state';
import { validateTimeRange } from '../helpers/validate_time_range';
import { addFatalError } from '../../../../kibana_legacy/public';
import {
  SAMPLE_SIZE_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SEARCH_ON_PAGE_LOAD_SETTING,
} from '../../../common';
import { loadIndexPattern, resolveIndexPattern } from '../helpers/resolve_index_pattern';
import { updateSearchSource } from '../helpers/update_search_source';
import { calcFieldCounts } from '../helpers/calc_field_counts';
import { DiscoverSearchSessionManager } from './discover_search_session';
import { applyAggsToSearchSource, getDimensions } from '../components/histogram';
import { fetchStatuses } from '../components/constants';

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
          const { appStateContainer } = getState({ history, uiSettings: config });
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

function discoverController($route, $scope) {
  const { isDefault: isDefaultType } = indexPatternsUtils;
  const subscriptions = new Subscription();
  const refetch$ = new Subject();

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
    getStateDefaults: () =>
      getStateDefaults({
        config,
        data,
        indexPattern: $scope.indexPattern,
        savedSearch,
        searchSource: persistentSearchSource,
      }),
    storeInSessionStorage: config.get('state:storeInSessionStorage'),
    history,
    toasts: core.notifications.toasts,
    uiSettings: config,
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
  const showUnmappedFields = $scope.useNewFieldsApi;
  const updateSearchSourceHelper = () => {
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
  };

  const appStateUnsubscribe = appStateContainer.subscribe(async (newState) => {
    const { state: newStatePartial } = splitState(newState);
    const { state: oldStatePartial } = splitState(getPreviousAppState());

    if (!_.isEqual(newStatePartial, oldStatePartial)) {
      $scope.$evalAsync(async () => {
        // NOTE: this is also called when navigating from discover app to context app
        if (newStatePartial.index && oldStatePartial.index !== newStatePartial.index) {
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

  $scope.fetchStatus = fetchStatuses.UNINITIALIZED;
  $scope.resultState = shouldSearchOnPageLoad() ? 'loading' : 'uninitialized';

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
  $scope.state.index = $scope.indexPattern.id;
  $scope.state.sort = getSortArray($scope.state.sort, $scope.indexPattern);

  $scope.opts.fetch = $scope.fetch = async function () {
    $scope.fetchCounter++;
    $scope.fetchError = undefined;
    if (!validateTimeRange(timefilter.getTime(), toastNotifications)) {
      $scope.resultState = 'none';
    }

    // Abort any in-progress requests before fetching again
    if (abortController) abortController.abort();
    abortController = new AbortController();

    const searchSessionId = searchSessionManager.getNextSearchSessionId();
    updateSearchSourceHelper();

    $scope.opts.chartAggConfigs = applyAggsToSearchSource(
      getTimeField() && !$scope.state.hideChart,
      volatileSearchSource,
      $scope.state.interval,
      $scope.indexPattern,
      data
    );

    $scope.fetchStatus = fetchStatuses.LOADING;
    $scope.resultState = getResultState($scope.fetchStatus, $scope.rows);

    inspectorAdapters.requests.reset();
    return $scope.volatileSearchSource
      .fetch$({
        abortSignal: abortController.signal,
        sessionId: searchSessionId,
        inspector: {
          adapter: inspectorAdapters.requests,
          title: i18n.translate('discover.inspectorRequestDataTitle', {
            defaultMessage: 'data',
          }),
          description: i18n.translate('discover.inspectorRequestDescription', {
            defaultMessage: 'This request queries Elasticsearch to fetch the data for the search.',
          }),
        },
      })
      .toPromise()
      .then(({ rawResponse }) => onResults(rawResponse))
      .catch((error) => {
        // If the request was aborted then no need to surface this error in the UI
        if (error instanceof Error && error.name === 'AbortError') return;

        $scope.fetchStatus = fetchStatuses.NO_RESULTS;
        $scope.fetchError = error;
        data.search.showError(error);
      })
      .finally(() => {
        $scope.resultState = getResultState($scope.fetchStatus, $scope.rows);
        $scope.$apply();
      });
  };

  function onResults(resp) {
    if (getTimeField() && !$scope.state.hideChart) {
      const tabifiedData = tabifyAggResponse($scope.opts.chartAggConfigs, resp);
      $scope.volatileSearchSource.rawResponse = resp;
      const dimensions = getDimensions($scope.opts.chartAggConfigs, data);
      if (dimensions) {
        $scope.histogramData = discoverResponseHandler(tabifiedData, dimensions);
      }
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

  $scope.refreshAppState = async () => {
    $scope.hits = [];
    $scope.rows = [];
    $scope.fieldCounts = {};
    await refetch$.next();
  };

  $scope.resetQuery = function () {
    history.push(
      $route.current.params.id ? `/view/${encodeURIComponent($route.current.params.id)}` : '/'
    );
    $route.reload();
  };

  $scope.newQuery = function () {
    history.push('/');
  };

  $scope.unmappedFieldsConfig = {
    showUnmappedFields,
  };

  // handler emitted by `timefilter.getAutoRefreshFetch$()`
  // to notify when data completed loading and to start a new autorefresh loop
  let autoRefreshDoneCb;
  const fetch$ = merge(
    refetch$,
    filterManager.getFetches$(),
    timefilter.getFetch$(),
    timefilter.getAutoRefreshFetch$().pipe(
      tap((done) => {
        autoRefreshDoneCb = done;
      }),
      filter(() => $scope.fetchStatus !== fetchStatuses.LOADING)
    ),
    data.query.queryString.getUpdates$(),
    searchSessionManager.newSearchSessionIdFromURL$
  ).pipe(debounceTime(100));

  subscriptions.add(
    subscribeWithScope(
      $scope,
      fetch$,
      {
        next: async () => {
          try {
            await $scope.fetch();
          } finally {
            // if there is a saved `autoRefreshDoneCb`, notify auto refresh service that
            // the last fetch is completed so it starts the next auto refresh loop if needed
            autoRefreshDoneCb?.();
            autoRefreshDoneCb = undefined;
          }
        },
      },
      (error) => addFatalError(core.fatalErrors, error)
    )
  );

  // Propagate current app state to url, then start syncing and fetching
  replaceUrlAppState().then(() => {
    startStateSync();
    if (shouldSearchOnPageLoad()) {
      refetch$.next();
    }
  });
}
