define(function (require) {
  let errors = require('ui/errors');
  let _ = require('lodash');

  require('ui/es');
  require('ui/promises');
  require('ui/safe_confirm');
  require('ui/index_patterns');

  require('ui/modules').get('kibana/courier')
  .service('courier', function ($rootScope, Private, Promise, indexPatterns, Notifier) {
    function Courier() {
      let self = this;

      let DocSource = Private(require('ui/courier/data_source/doc_source'));
      let SearchSource = Private(require('ui/courier/data_source/search_source'));
      let searchStrategy = Private(require('ui/courier/fetch/strategy/search'));

      let requestQueue = Private(require('ui/courier/_request_queue'));
      let errorHandlers = Private(require('ui/courier/_error_handlers'));

      let fetch = Private(require('ui/courier/fetch/fetch'));
      let docLooper = self.docLooper = Private(require('ui/courier/looper/doc'));
      let searchLooper = self.searchLooper = Private(require('ui/courier/looper/search'));

      // expose some internal modules
      self.setRootSearchSource = Private(require('ui/courier/data_source/_root_search_source')).set;

      self.SavedObject = Private(require('ui/courier/saved_object/saved_object'));
      self.indexPatterns = indexPatterns;
      self.redirectWhenMissing = Private(require('ui/courier/_redirect_when_missing'));

      self.DocSource = DocSource;
      self.SearchSource = SearchSource;

      let HastyRefresh = errors.HastyRefresh;

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
        let refreshValue = _.get($rootScope, 'timefilter.refreshInterval.value');
        let refreshPause = _.get($rootScope, 'timefilter.refreshInterval.pause');
        if (_.isNumber(refreshValue) && !refreshPause) {
          self.fetchInterval(refreshValue);
        } else {
          self.fetchInterval(0);
        }
      });

      let onFatalDefer = Promise.defer();
      onFatalDefer.promise.then(self.close);
      Notifier.fatalCallbacks.push(onFatalDefer.resolve);
    }

    return new Courier();
  });
});
