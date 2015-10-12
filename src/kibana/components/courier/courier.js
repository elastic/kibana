define(function (require) {
  var errors = require('errors');
  var _ = require('lodash');

  require('services/es');
  require('services/promises');
  require('components/safe_confirm/safe_confirm');
  require('components/index_patterns/index_patterns');

  require('modules').get('kibana/courier')
  .service('courier', function ($rootScope, Private, Promise, indexPatterns, Notifier) {
    function Courier() {
      var self = this;

      var DocSource = Private(require('components/courier/data_source/doc_source'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));

      var requestQueue = Private(require('components/courier/_request_queue'));
      var errorHandlers = Private(require('components/courier/_error_handlers'));

      var fetch = Private(require('components/courier/fetch/fetch'));
      var docLooper = self.docLooper = Private(require('components/courier/looper/doc'));
      var searchLooper = self.searchLooper = Private(require('components/courier/looper/search'));

      // expose some internal modules
      self.setRootSearchSource = Private(require('components/courier/data_source/_root_search_source')).set;

      self.SavedObject = Private(require('components/courier/saved_object/saved_object'));
      self.indexPatterns = indexPatterns;
      self.redirectWhenMissing = Private(require('components/courier/_redirect_when_missing'));

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
        fetch.searches().then(function () {
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
        var refreshValue = _.deepGet($rootScope, 'timefilter.refreshInterval.value');
        var refreshPause = _.deepGet($rootScope, 'timefilter.refreshInterval.pause');
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
});
