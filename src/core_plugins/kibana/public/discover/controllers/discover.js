import _ from 'lodash';
import angular from 'angular';
import { getSort } from 'ui/doc_table/lib/get_sort';
import * as columnActions from 'ui/doc_table/actions/columns';
import * as filterActions from 'ui/doc_table/actions/filter';
import dateMath from '@kbn/datemath';
import 'ui/doc_table';
import 'ui/visualize';
import 'ui/fixed_scroll';
import 'ui/directives/validate_json';
import 'ui/filters/moment';
import 'ui/courier';
import 'ui/index_patterns';
import 'ui/state_management/app_state';
import 'ui/timefilter';
import 'ui/share';
import 'ui/query_bar';
import { toastNotifications, getPainlessError } from 'ui/notify';
import { VisProvider } from 'ui/vis';
import { BasicResponseHandlerProvider } from 'ui/vis/response_handlers/basic';
import { DocTitleProvider } from 'ui/doc_title';
import PluginsKibanaDiscoverHitSortFnProvider from '../_hit_sort_fn';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { AggTypesBucketsIntervalOptionsProvider } from 'ui/agg_types/buckets/_interval_options';
import { stateMonitorFactory } from 'ui/state_management/state_monitor_factory';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import indexTemplate from '../index.html';
import { StateProvider } from 'ui/state_management/state';
import { migrateLegacyQuery } from 'ui/utils/migrateLegacyQuery';
import { FilterManagerProvider } from 'ui/filter_manager';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import { recentlyAccessed } from 'ui/persisted_log';
import { getDocLink } from 'ui/documentation_links';
import '../components/fetch_error';

const app = uiModules.get('apps/discover', [
  'kibana/notify',
  'kibana/courier',
  'kibana/index_patterns'
]);

uiRoutes
  .defaults(/discover/, {
    requireDefaultIndex: true
  })
  .when('/discover/:id?', {
    template: indexTemplate,
    reloadOnSearch: false,
    resolve: {
      ip: function (Promise, courier, config, $location, Private) {
        const State = Private(StateProvider);
        const savedObjectsClient = Private(SavedObjectsClientProvider);

        return savedObjectsClient.find({
          type: 'index-pattern',
          fields: ['title'],
          perPage: 10000
        })
          .then(({ savedObjects }) => {
            /**
             *  In making the indexPattern modifiable it was placed in appState. Unfortunately,
             *  the load order of AppState conflicts with the load order of many other things
             *  so in order to get the name of the index we should use, and to switch to the
             *  default if necessary, we parse the appState with a temporary State object and
             *  then destroy it immediatly after we're done
             *
             *  @type {State}
             */
            const state = new State('_a', {});

            const specified = !!state.index;
            const exists = _.findIndex(savedObjects, o => o.id === state.index) > -1;
            const id = exists ? state.index : config.get('defaultIndex');
            state.destroy();

            return Promise.props({
              list: savedObjects,
              loaded: courier.indexPatterns.get(id),
              stateVal: state.index,
              stateValFound: specified && exists
            });
          });
      },
      savedSearch: function (courier, savedSearches, $route) {
        const savedSearchId = $route.current.params.id;
        return savedSearches.get(savedSearchId)
          .then((savedSearch) => {
            if (savedSearchId) {
              recentlyAccessed.add(
                savedSearch.getFullPath(),
                savedSearch.title,
                savedSearchId);
            }
            return savedSearch;
          })
          .catch(courier.redirectWhenMissing({
            'search': '/discover',
            'index-pattern': '/management/kibana/objects/savedSearches/' + $route.current.params.id
          }));
      }
    }
  });

app.directive('discoverApp', function () {
  return {
    restrict: 'E',
    controllerAs: 'discoverApp',
    controller: discoverController
  };
});

function discoverController(
  $element,
  $route,
  $scope,
  $timeout,
  $window,
  AppState,
  Notifier,
  Private,
  Promise,
  config,
  courier,
  kbnUrl,
  timefilter,
  localStorage,
) {

  const Vis = Private(VisProvider);
  const docTitle = Private(DocTitleProvider);
  const HitSortFn = Private(PluginsKibanaDiscoverHitSortFnProvider);
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const responseHandler = Private(BasicResponseHandlerProvider).handler;
  const filterManager = Private(FilterManagerProvider);
  const notify = new Notifier({
    location: 'Discover'
  });

  $scope.getDocLink = getDocLink;
  $scope.intervalOptions = Private(AggTypesBucketsIntervalOptionsProvider);
  $scope.showInterval = false;
  $scope.minimumVisibleRows = 50;

  $scope.intervalEnabled = function (interval) {
    return interval.val !== 'custom';
  };

  $scope.topNavMenu = [{
    key: 'new',
    description: 'New Search',
    run: function () { kbnUrl.change('/discover'); },
    testId: 'discoverNewButton',
  }, {
    key: 'save',
    description: 'Save Search',
    template: require('plugins/kibana/discover/partials/save_search.html'),
    testId: 'discoverSaveButton',
  }, {
    key: 'open',
    description: 'Open Saved Search',
    template: require('plugins/kibana/discover/partials/load_search.html'),
    testId: 'discoverOpenButton',
  }, {
    key: 'share',
    description: 'Share Search',
    template: require('plugins/kibana/discover/partials/share_search.html'),
    testId: 'discoverShareButton',
  }];
  $scope.timefilter = timefilter;


  // the saved savedSearch
  const savedSearch = $route.current.locals.savedSearch;
  $scope.$on('$destroy', savedSearch.destroy);

  // the actual courier.SearchSource
  $scope.searchSource = savedSearch.searchSource;
  $scope.indexPattern = resolveIndexPatternLoading();
  $scope.searchSource
    .set('index', $scope.indexPattern)
    .highlightAll(true)
    .version(true);

  const pageTitleSuffix = savedSearch.id && savedSearch.title ? `: ${savedSearch.title}` : '';
  docTitle.change(`Discover${pageTitleSuffix}`);

  let stateMonitor;
  const $appStatus = $scope.appStatus = this.appStatus = {
    dirty: !savedSearch.id
  };

  const $state = $scope.state = new AppState(getStateDefaults());

  const getFieldCounts = async () => {
    // the field counts aren't set until we have the data back,
    // so we wait for the fetch to be done before proceeding
    if (!$scope.fetchStatus) {
      return $scope.fieldCounts;
    }

    return await new Promise(resolve => {
      const unwatch = $scope.$watch('fetchStatus', (newValue) => {
        if (newValue) {
          return;
        }

        unwatch();
        resolve($scope.fieldCounts);
      });
    });
  };


  const getSharingDataFields = async () => {
    const selectedFields = $state.columns;
    if (selectedFields.length === 1 && selectedFields[0] ===  '_source') {
      const fieldCounts = await getFieldCounts();
      return {
        searchFields: null,
        selectFields: _.keys(fieldCounts).sort()
      };
    }

    const timeFieldName = $scope.indexPattern.timeFieldName;
    const fields = timeFieldName ? [timeFieldName, ...selectedFields] : selectedFields;
    return {
      searchFields: fields,
      selectFields: fields
    };
  };

  this.getSharingData = async () => {
    const searchSource = $scope.searchSource.clone();

    const { searchFields, selectFields } = await getSharingDataFields();
    searchSource.set('fields', searchFields);
    searchSource.set('sort', getSort($state.sort, $scope.indexPattern));
    searchSource.set('highlight', null);
    searchSource.set('highlightAll', null);
    searchSource.set('aggs', null);
    searchSource.set('size', null);

    const body = await searchSource.getSearchRequestBody();
    return {
      searchRequest: {
        index: searchSource.get('index').title,
        body
      },
      fields: selectFields,
      metaFields: $scope.indexPattern.metaFields,
      conflictedTypesFields: $scope.indexPattern.fields.filter(f => f.type === 'conflict').map(f => f.name),
      indexPatternId: searchSource.get('index').id
    };
  };

  this.getSharingType = () => {
    return 'search';
  };

  this.getSharingTitle = () => {
    return savedSearch.title;
  };

  $scope.uiState = $state.makeStateful('uiState');

  function getStateDefaults() {
    return {
      query: $scope.searchSource.get('query') || {
        query: '',
        language: localStorage.get('kibana.userQueryLanguage') || config.get('search:queryLanguage')
      },
      sort: getSort.array(savedSearch.sort, $scope.indexPattern, config.get('discover:sort:defaultOrder')),
      columns: savedSearch.columns.length > 0 ? savedSearch.columns : config.get('defaultColumns').slice(),
      index: $scope.indexPattern.id,
      interval: 'auto',
      filters: _.cloneDeep($scope.searchSource.getOwn('filter'))
    };
  }

  $state.index = $scope.indexPattern.id;
  $state.sort = getSort.array($state.sort, $scope.indexPattern);

  $scope.getBucketIntervalToolTipText = () => {
    return (
      `This interval creates ${$scope.bucketInterval.scale > 1 ? 'buckets that are too large' : 'too many buckets'}
      to show in the selected time range, so it has been scaled to ${$scope.bucketInterval.description }`
    );
  };

  $scope.$watchCollection('state.columns', function () {
    $state.save();
  });

  $scope.opts = {
    // number of records to fetch, then paginate through
    sampleSize: config.get('discover:sampleSize'),
    timefield: $scope.indexPattern.timeFieldName,
    savedSearch: savedSearch,
    indexPatternList: $route.current.locals.ip.list,
    timefilter: $scope.timefilter
  };

  const init = _.once(function () {
    stateMonitor = stateMonitorFactory.create($state, getStateDefaults());
    stateMonitor.onChange((status) => {
      $appStatus.dirty = status.dirty || !savedSearch.id;
    });
    $scope.$on('$destroy', () => stateMonitor.destroy());

    $scope.updateDataSource()
      .then(function () {
        $scope.$listen(timefilter, 'fetch', function () {
          $scope.fetch();
        });

        $scope.$watchCollection('state.sort', function (sort) {
          if (!sort) return;

          // get the current sort from {key: val} to ["key", "val"];
          const currentSort = _.pairs($scope.searchSource.get('sort')).pop();

          // if the searchSource doesn't know, tell it so
          if (!angular.equals(sort, currentSort)) $scope.fetch();
        });

        // update data source when filters update
        $scope.$listen(queryFilter, 'update', function () {
          return $scope.updateDataSource().then(function () {
            $state.save();
          });
        });

        // update data source when hitting forward/back and the query changes
        $scope.$listen($state, 'fetch_with_changes', function (diff) {
          if (diff.indexOf('query') >= 0) $scope.fetch();
        });

        // fetch data when filters fire fetch event
        $scope.$listen(queryFilter, 'fetch', $scope.fetch);

        timefilter.enableAutoRefreshSelector();
        $scope.$watch('opts.timefield', function (timefield) {
          if (!!timefield) {
            timefilter.enableTimeRangeSelector();
          } else {
            timefilter.disableTimeRangeSelector();
          }
        });

        $scope.$watch('state.interval', function () {
          $scope.fetch();
        });

        $scope.$watch('vis.aggs', function () {
        // no timefield, no vis, nothing to update
          if (!$scope.opts.timefield) return;

          const buckets = $scope.vis.getAggConfig().bySchemaGroup.buckets;

          if (buckets && buckets.length === 1) {
            $scope.bucketInterval = buckets[0].buckets.getInterval();
          }
        });

        $scope.$watch('state.query', $scope.updateQueryAndFetch);

        $scope.$watchMulti([
          'rows',
          'fetchStatus'
        ], (function updateResultState() {
            let prev = {};
            const status = {
              LOADING: 'loading', // initial data load
              READY: 'ready', // results came back
              NO_RESULTS: 'none' // no results came back
            };

            function pick(rows, oldRows, fetchStatus) {
              // initial state, pretend we are loading
              if (rows == null && oldRows == null) return status.LOADING;

              const rowsEmpty = _.isEmpty(rows);
              // An undefined fetchStatus means the requests are still being
              // prepared to be sent. When all requests are completed,
              // fetchStatus is set to null, so it's important that we
              // specifically check for undefined to determine a loading status.
              const preparingForFetch = _.isUndefined(fetchStatus);
              if (preparingForFetch) return status.LOADING;
              else if (rowsEmpty && fetchStatus) return status.LOADING;
              else if (!rowsEmpty) return status.READY;
              else return status.NO_RESULTS;
            }

            return function () {
              const current = {
                rows: $scope.rows,
                fetchStatus: $scope.fetchStatus
              };

              $scope.resultState = pick(
                current.rows,
                prev.rows,
                current.fetchStatus,
                prev.fetchStatus
              );

              prev = current;
            };
          }()));

        if ($scope.opts.timefield) {
          setupVisualization();
          $scope.updateTime();
        }

        init.complete = true;
        $state.replace();
      });
  });

  $scope.opts.saveDataSource = function () {
    return $scope.updateDataSource()
      .then(function () {
        savedSearch.columns = $scope.state.columns;
        savedSearch.sort = $scope.state.sort;

        return savedSearch.save()
          .then(function (id) {
            stateMonitor.setInitialState($state.toJSON());
            $scope.kbnTopNav.close('save');

            if (id) {
              toastNotifications.addSuccess({
                title: `Search '${savedSearch.title}' was saved`,
                'data-test-subj': 'saveSearchSuccess',
              });

              if (savedSearch.id !== $route.current.params.id) {
                kbnUrl.change('/discover/{{id}}', { id: savedSearch.id });
              } else {
                // Update defaults so that "reload saved query" functions correctly
                $state.setDefaults(getStateDefaults());
                docTitle.change(savedSearch.lastSavedTitle);
              }
            }
          });
      })
      .catch(notify.error);
  };

  $scope.opts.fetch = $scope.fetch = function () {
    // ignore requests to fetch before the app inits
    if (!init.complete) return;

    $scope.fetchError = undefined;

    $scope.updateTime();

    $scope.updateDataSource()
      .then(setupVisualization)
      .then(function () {
        $state.save();
        return courier.fetch();
      })
      .catch(notify.error);
  };

  $scope.updateQueryAndFetch = function (query) {
    $state.query = migrateLegacyQuery(query);
    $scope.fetch();
  };


  function handleSegmentedFetch(segmented) {
    function flushResponseData() {
      $scope.fetchError = undefined;
      $scope.hits = 0;
      $scope.faliures = [];
      $scope.rows = [];
      $scope.fieldCounts = {};
    }

    if (!$scope.rows) flushResponseData();

    const sort = $state.sort;
    const timeField = $scope.indexPattern.timeFieldName;

    /**
     * Basically an emum.
     *
     * opts:
     *   "time" - sorted by the timefield
     *   "non-time" - explicitly sorted by a non-time field, NOT THE SAME AS `sortBy !== "time"`
     *   "implicit" - no sorting set, NOT THE SAME AS "non-time"
     *
     * @type {String}
     */
    const sortBy = (function () {
      if (!Array.isArray(sort)) return 'implicit';
      else if (sort[0] === '_score') return 'implicit';
      else if (sort[0] === timeField) return 'time';
      else return 'non-time';
    }());

    let sortFn = null;
    if (sortBy !== 'implicit') {
      sortFn = new HitSortFn(sort[1]);
    }

    $scope.updateTime();
    if (sort[0] === '_score') segmented.setMaxSegments(1);
    segmented.setDirection(sortBy === 'time' ? (sort[1] || 'desc') : 'desc');
    segmented.setSortFn(sortFn);
    segmented.setSize($scope.opts.sampleSize);

    // triggered when the status updated
    segmented.on('status', function (status) {
      $scope.fetchStatus = status;
    });

    segmented.on('first', function () {
      flushResponseData();
    });

    segmented.on('segment', notify.timed('handle each segment', function (resp) {
      if (resp._shards.failed > 0) {
        $scope.failures = _.union($scope.failures, resp._shards.failures);
        $scope.failures = _.uniq($scope.failures, false, function (failure) {
          return failure.index + failure.shard + failure.reason;
        });
      }
    }));

    segmented.on('mergedSegment', function (merged) {
      $scope.mergedEsResp = merged;

      if ($scope.opts.timefield) {
        $scope.searchSource.rawResponse = merged;
        Promise
          .resolve(responseHandler($scope.vis, merged))
          .then(resp => {
            $scope.visData = resp;
          });
      }

      $scope.hits = merged.hits.total;

      const indexPattern = $scope.searchSource.get('index');

      // the merge rows, use a new array to help watchers
      $scope.rows = merged.hits.hits.slice();

      notify.event('flatten hit and count fields', function () {
        let counts = $scope.fieldCounts;

        // if we haven't counted yet, or need a fresh count because we are sorting, reset the counts
        if (!counts || sortFn) counts = $scope.fieldCounts = {};

        $scope.rows.forEach(function (hit) {
          // skip this work if we have already done it
          if (hit.$$_counted) return;

          // when we are sorting results, we need to redo the counts each time because the
          // "top 500" may change with each response, so don't mark this as counted
          if (!sortFn) hit.$$_counted = true;

          const fields = _.keys(indexPattern.flattenHit(hit));
          let n = fields.length;
          let field;
          while (field = fields[--n]) {
            if (counts[field]) counts[field] += 1;
            else counts[field] = 1;
          }
        });
      });
    });

    segmented.on('complete', function () {
      if ($scope.fetchStatus.hitCount === 0) {
        flushResponseData();
      }

      $scope.fetchStatus = null;
    });
  }


  function beginSegmentedFetch() {
    $scope.searchSource.onBeginSegmentedFetch(handleSegmentedFetch)
      .catch((error) => {
        const fetchError = getPainlessError(error);

        if (fetchError) {
          $scope.fetchError = fetchError;
        } else {
          notify.error(error);
        }

        // Restart. This enables auto-refresh functionality.
        beginSegmentedFetch();
      });
  }
  beginSegmentedFetch();

  $scope.updateTime = function () {
    $scope.timeRange = {
      from: dateMath.parse(timefilter.time.from),
      to: dateMath.parse(timefilter.time.to, { roundUp: true })
    };
  };

  $scope.resetQuery = function () {
    kbnUrl.change('/discover/{{id}}', { id: $route.current.params.id });
  };

  $scope.newQuery = function () {
    kbnUrl.change('/discover');
  };

  $scope.updateDataSource = Promise.method(function updateDataSource() {
    $scope.searchSource
      .size($scope.opts.sampleSize)
      .sort(getSort($state.sort, $scope.indexPattern))
      .query(!$state.query ? null : $state.query)
      .set('filter', queryFilter.getFilters());
  });

  $scope.setSortOrder = function setSortOrder(columnName, direction) {
    $scope.state.sort = [columnName, direction];
  };

  // TODO: On array fields, negating does not negate the combination, rather all terms
  $scope.filterQuery = function (field, values, operation) {
    $scope.indexPattern.popularizeField(field, 1);
    filterActions.addFilter(field, values, operation, $scope.indexPattern.id, $scope.state, filterManager);
  };

  $scope.addColumn = function addColumn(columnName) {
    $scope.indexPattern.popularizeField(columnName, 1);
    columnActions.addColumn($scope.state.columns, columnName);
  };

  $scope.removeColumn = function removeColumn(columnName) {
    $scope.indexPattern.popularizeField(columnName, 1);
    columnActions.removeColumn($scope.state.columns, columnName);
  };

  $scope.moveColumn = function moveColumn(columnName, newIndex) {
    columnActions.moveColumn($scope.state.columns, columnName, newIndex);
  };

  $scope.scrollToTop = function () {
    $window.scrollTo(0, 0);
  };

  $scope.scrollToBottom = function () {
    // delay scrolling to after the rows have been rendered
    $timeout(() => {
      $element.find('#discoverBottomMarker').focus();
    }, 0);
  };

  $scope.showAllRows = function () {
    $scope.minimumVisibleRows = $scope.hits;
  };

  function setupVisualization() {
    // If no timefield has been specified we don't create a histogram of messages
    if (!$scope.opts.timefield) return;

    const visStateAggs = [
      {
        type: 'count',
        schema: 'metric'
      },
      {
        type: 'date_histogram',
        schema: 'segment',
        params: {
          field: $scope.opts.timefield,
          interval: $state.interval
        }
      }
    ];

    // we have a vis, just modify the aggs
    if ($scope.vis) {
      const visState = $scope.vis.getEnabledState();
      visState.aggs = visStateAggs;

      $scope.vis.setState(visState);
    } else {
      $scope.vis = new Vis($scope.indexPattern, {
        title: savedSearch.title,
        type: 'histogram',
        params: {
          addLegend: false,
          addTimeMarker: true
        },
        aggs: visStateAggs
      });

      $scope.searchSource.onRequestStart((searchSource, searchRequest) => {
        return $scope.vis.onSearchRequestStart(searchSource, searchRequest);
      });

      $scope.searchSource.aggs(function () {
        return $scope.vis.getAggConfig().toDsl();
      });
    }

    $scope.vis.filters = {
      timeRange: timefilter.time
    };
  }

  function resolveIndexPatternLoading() {
    const props = $route.current.locals.ip;
    const loaded = props.loaded;
    const stateVal = props.stateVal;
    const stateValFound = props.stateValFound;

    const own = $scope.searchSource.getOwn('index');

    if (own && !stateVal) return own;
    if (stateVal && !stateValFound) {
      const err = '"' + stateVal + '" is not a configured pattern ID. ';
      if (own) {
        notify.warning(`${err} Using the saved index pattern: "${own.title}" (${own.id})`);
        return own;
      }

      notify.warning(`${err} Using the default index pattern: "${loaded.title}" (${loaded.id})`);
    }
    return loaded;
  }

  init();
}
