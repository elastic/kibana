import _ from 'lodash';

import 'ui/es';
import 'ui/promises';
import 'ui/index_patterns';
import uiModules from 'ui/modules';
import Notifier from 'ui/notify/notifier';

import DocSourceProvider from './data_source/doc_source';
import SearchSourceProvider from './data_source/search_source';
import SearchStrategyProvider from './fetch/strategy/search';
import RequestQueueProvider from './_request_queue';
import FetchProvider from './fetch';
import DocDataLooperProvider from './looper/doc_data';
import DocAdminLooperProvider from './looper/doc_admin';
import SearchLooperProvider from './looper/search';
import RootSearchSourceProvider from './data_source/_root_search_source';
import SavedObjectProvider from './saved_object';
import RedirectWhenMissingProvider from './_redirect_when_missing';


uiModules.get('kibana/courier')
.service('courier', function ($rootScope, Private, Promise, indexPatterns) {
  function Courier() {
    const self = this;

    const DocSource = Private(DocSourceProvider);
    const SearchSource = Private(SearchSourceProvider);
    const searchStrategy = Private(SearchStrategyProvider);

    const requestQueue = Private(RequestQueueProvider);

    const fetch = Private(FetchProvider);
    const docDataLooper = self.docLooper = Private(DocDataLooperProvider);
    const docAdminLooper = self.docLooper = Private(DocAdminLooperProvider);
    const searchLooper = self.searchLooper = Private(SearchLooperProvider);

    // expose some internal modules
    self.setRootSearchSource = Private(RootSearchSourceProvider).set;

    self.SavedObject = Private(SavedObjectProvider);
    self.indexPatterns = indexPatterns;
    self.redirectWhenMissing = Private(RedirectWhenMissingProvider);

    self.DocSource = DocSource;
    self.SearchSource = SearchSource;

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
      docDataLooper.start();
      docAdminLooper.start();
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
      docAdminLooper.stop();
      docDataLooper.stop();

      _.invoke(requestQueue, 'abort');

      if (requestQueue.length) {
        throw new Error('Aborting all pending requests failed.');
      }
    };

    // Listen for refreshInterval changes
    $rootScope.$watchCollection('timefilter.refreshInterval', function () {
      const refreshValue = _.get($rootScope, 'timefilter.refreshInterval.value');
      const refreshPause = _.get($rootScope, 'timefilter.refreshInterval.pause');
      if (_.isNumber(refreshValue) && !refreshPause) {
        self.fetchInterval(refreshValue);
      } else {
        self.fetchInterval(0);
      }
    });

    const onFatalDefer = Promise.defer();
    onFatalDefer.promise.then(self.close);
    Notifier.fatalCallbacks.push(onFatalDefer.resolve);
  }

  return new Courier();
});
