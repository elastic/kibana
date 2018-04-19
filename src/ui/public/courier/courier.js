import _ from 'lodash';

import '../es';
import '../promises';
import '../index_patterns';
import { uiModules } from '../modules';
import { addFatalErrorCallback } from '../notify';

import { SearchSourceProvider } from './data_source/search_source';
import { requestQueue } from './_request_queue';
import { FetchSoonProvider } from './fetch';
import { SearchLooperProvider } from './looper/search';
import { RootSearchSourceProvider } from './data_source/_root_search_source';
import { SavedObjectProvider } from './saved_object';
import { RedirectWhenMissingProvider } from './_redirect_when_missing';


uiModules.get('kibana/courier')
  .service('courier', function ($rootScope, Private, indexPatterns) {
    function Courier() {
      const self = this;
      const SearchSource = Private(SearchSourceProvider);
      const fetchSoon = Private(FetchSoonProvider);
      const searchLooper = self.searchLooper = Private(SearchLooperProvider);

      // expose some internal modules
      self.setRootSearchSource = Private(RootSearchSourceProvider).set;

      self.SavedObject = Private(SavedObjectProvider);
      self.indexPatterns = indexPatterns;
      self.redirectWhenMissing = Private(RedirectWhenMissingProvider);

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
        return this;
      };

      /**
     * Process the pending request queue right now, returns
     * a promise that resembles the success of the fetch completing,
     * individual errors are routed to their respective requests.
     */
      self.fetch = function () {
        fetchSoon.fetchQueued().then(function () {
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
     * Abort all pending requests
     * @return {[type]} [description]
     */
      self.close = function () {
        searchLooper.stop();

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

      const closeOnFatal = _.once(self.close);
      addFatalErrorCallback(closeOnFatal);
    }

    return new Courier();
  });
