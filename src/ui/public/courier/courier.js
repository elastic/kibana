import errors from 'ui/errors';
import _ from 'lodash';
import 'ui/es';
import 'ui/promises';
import 'ui/safe_confirm';
import 'ui/index_patterns';
import CourierDataSourceDocSourceProvider from 'ui/courier/data_source/doc_source';
import CourierDataSourceSearchSourceProvider from 'ui/courier/data_source/search_source';
import CourierFetchStrategySearchProvider from 'ui/courier/fetch/strategy/search';
import CourierRequestQueueProvider from 'ui/courier/_request_queue';
import CourierErrorHandlersProvider from 'ui/courier/_error_handlers';
import CourierFetchFetchProvider from 'ui/courier/fetch/fetch';
import CourierLooperDocProvider from 'ui/courier/looper/doc';
import CourierLooperSearchProvider from 'ui/courier/looper/search';
import CourierDataSourceRootSearchSourceProvider from 'ui/courier/data_source/_root_search_source';
import CourierSavedObjectSavedObjectProvider from 'ui/courier/saved_object/saved_object';
import CourierRedirectWhenMissingProvider from 'ui/courier/_redirect_when_missing';
import uiModules from 'ui/modules';


uiModules.get('kibana/courier')
.service('courier', function ($rootScope, Private, Promise, indexPatterns, Notifier) {
  function Courier() {
    var self = this;

    var DocSource = Private(CourierDataSourceDocSourceProvider);
    var SearchSource = Private(CourierDataSourceSearchSourceProvider);
    var searchStrategy = Private(CourierFetchStrategySearchProvider);

    var requestQueue = Private(CourierRequestQueueProvider);
    var errorHandlers = Private(CourierErrorHandlersProvider);

    var fetch = Private(CourierFetchFetchProvider);
    var docLooper = self.docLooper = Private(CourierLooperDocProvider);
    var searchLooper = self.searchLooper = Private(CourierLooperSearchProvider);

    // expose some internal modules
    self.setRootSearchSource = Private(CourierDataSourceRootSearchSourceProvider).set;

    self.SavedObject = Private(CourierSavedObjectSavedObjectProvider);
    self.indexPatterns = indexPatterns;
    self.redirectWhenMissing = Private(CourierRedirectWhenMissingProvider);

    self.DocSource = DocSource;
    self.SearchSource = SearchSource;

    var HastyRefresh = errors.HastyRefresh;

    /**
     * update the time between automatic search requests
     *
     * @chainable
     */
    self.fetchInterval = function (ms) {
      searchLooper.ms(ms);
      return this;
    };

    /**
     * Start fetching search requests on an interval
     * @chainable
     */
    self.start = function () {
      searchLooper.start();
      docLooper.start();
      return this;
    };

    /**
     * Process the pending request queue right now, returns
     * a promise that resembles the success of the fetch completing,
     * individual errors are routed to their respective requests.
     */
    self.fetch = function () {
      fetch.fetchQueued(searchStrategy).then(function () {
        searchLooper.restart();
      });
    };


    /**
     * is the currior currently fetching search
     * results automatically?
     *
     * @return {boolean}
     */
    self.started = function () {
      return searchLooper.started();
    };


    /**
     * stop the courier from fetching more search
     * results, does not stop vaidating docs.
     *
     * @chainable
     */
    self.stop = function () {
      searchLooper.stop();
      return this;
    };


    /**
     * create a source object that is a child of this courier
     *
     * @param {string} type - the type of Source to create
     */
    self.createSource = function (type) {
      switch (type) {
        case 'doc':
          return new DocSource();
        case 'search':
          return new SearchSource();
      }
    };

    /**
     * Abort all pending requests
     * @return {[type]} [description]
     */
    self.close = function () {
      searchLooper.stop();
      docLooper.stop();

      _.invoke(requestQueue, 'abort');

      if (requestQueue.length) {
        throw new Error('Aborting all pending requests failed.');
      }
    };

    // Listen for refreshInterval changes
    $rootScope.$watchCollection('timefilter.refreshInterval', function () {
      var refreshValue = _.get($rootScope, 'timefilter.refreshInterval.value');
      var refreshPause = _.get($rootScope, 'timefilter.refreshInterval.pause');
      if (_.isNumber(refreshValue) && !refreshPause) {
        self.fetchInterval(refreshValue);
      } else {
        self.fetchInterval(0);
      }
    });

    var onFatalDefer = Promise.defer();
    onFatalDefer.promise.then(self.close);
    Notifier.fatalCallbacks.push(onFatalDefer.resolve);
  }

  return new Courier();
});
