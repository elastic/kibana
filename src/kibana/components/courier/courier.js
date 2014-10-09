define(function (require) {
  var errors = require('errors');

  require('services/es');
  require('services/promises');
  require('components/index_patterns/index_patterns');

  require('modules').get('kibana/courier')
  .service('courier', function ($rootScope, Private, Promise, indexPatterns) {
    function Courier() {
      var courier = this;

      var DocSource = Private(require('components/courier/data_source/doc_source'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));

      var pendingRequests = Private(require('components/courier/_pending_requests'));

      var docLooper = courier.docLooper = Private(require('components/courier/looper/doc'));
      var searchLooper = courier.searchLooper = Private(require('components/courier/looper/search'));

      // expose some internal modules
      courier.setRootSearchSource = Private(require('components/courier/data_source/_root_search_source')).set;

      courier.SavedObject = Private(require('components/courier/saved_object/saved_object'));
      courier.indexPatterns = indexPatterns;
      courier.redirectWhenMissing = Private(require('components/courier/_redirect_when_missing'));

      courier.DocSource = DocSource;
      courier.SearchSource = SearchSource;

      var HastyRefresh = errors.HastyRefresh;
      var Abort = errors.Abort;

      /**
       * update the time between automatic search requests
       *
       * @chainable
       */
      courier.fetchInterval = function (ms) {
        searchLooper.ms(ms);
        return this;
      };

      /**
       * Start fetching search requests on an interval
       * @chainable
       */
      courier.start = function () {
        searchLooper.start();
        return this;
      };

      /**
       * Process the pending request queue right now, returns
       * a promise that resembles the success of the fetch completing,
       * individual errors are routed to their respective requests.
       */
      courier.fetch = function () {
        return searchLooper.run();
      };


      /**
       * is the currior currently fetching search
       * results automatically?
       *
       * @return {boolean}
       */
      courier.started = function () {
        return searchLooper.started();
      };


      /**
       * stop the courier from fetching more search
       * results, does not stop vaidating docs.
       *
       * @chainable
       */
      courier.stop = function () {
        searchLooper.stop();
        return this;
      };


      /**
       * create a source object that is a child of this courier
       *
       * @param {string} type - the type of Source to create
       */
      courier.createSource = function (type) {
        switch (type) {
        case 'doc':
          return new DocSource();
        case 'search':
          return new SearchSource();
        }
      };

      courier.getFieldsFor = function (indexish) {
        return courier.indexPatterns.getFieldsFor(indexish);
      };

      /**
       * Abort all pending requests
       * @return {[type]} [description]
       */
      courier.close = function () {
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
