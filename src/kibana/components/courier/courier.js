define(function (require) {
  var errors = require('errors');

  require('services/es');
  require('services/promises');
  require('components/index_patterns/index_patterns');

  require('modules').get('kibana/courier')
  .service('courier', function ($rootScope, Private, Promise, indexPatterns) {
    function Courier() {
      var self = this;

      var DocSource = Private(require('components/courier/data_source/doc_source'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));

      var pendingRequests = Private(require('components/courier/_pending_requests'));

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
      var Abort = errors.Abort;

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
        return searchLooper.run();
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

        [].concat(pendingRequests.splice(0), this._errorHandlers.splice(0))
        .forEach(function (req) {
          req.defer.reject(new Abort());
        });

        if (pendingRequests.length) {
          throw new Error('Aborting all pending requests failed.');
        }
      };
    }

    return new Courier();
  });
});
