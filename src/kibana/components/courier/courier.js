define(function (require) {
  var _ = require('lodash');

  require('services/es');
  require('services/promises');

  var module = require('modules').get('kibana/courier');

  module.service('courier', function ($rootScope, Private, Promise) {
    var DocSource = Private(require('./data_source/doc_source'));
    var SearchSource = Private(require('./data_source/search_source'));

    var SavedObject = Private(require('./saved_object/saved_object'));

    var errors = Private(require('./_errors'));
    var pendingRequests = Private(require('./_pending_requests'));
    var searchLooper = Private(require('./looper/search'));
    var docLooper = Private(require('./looper/doc'));
    var indexPatterns = Private(require('./index_patterns/index_patterns'));

    var HastyRefresh = errors.HastyRefresh;

    function Courier() {
      var courier = this;

      // expose some internal modules
      courier.errors = errors;
      courier.SavedObject = SavedObject;
      courier.indexPatterns = indexPatterns;

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
       * individual errors are routed to their respectiv requests.
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
        return indexPatterns.getFieldsFor(indexish);
      };

      /**
       * Creates an error handler that will redirect to a url when a SavedObjectNotFound
       * error is thrown
       *
       * @param  {string} url - the url to redirect to
       * @return {function} - the handler to pass to .catch()
       */
      courier.redirectWhenMissing = Private(require('./_redirect_when_missing'));

      /**
       * Abort all pending requests
       * @return {[type]} [description]
       */
      courier.close = function () {
        searchLooper.stop();
        docLooper.stop();

        [].concat(pendingRequests.splice(0), this._errorHandlers.splice(0))
        .forEach(function (req) {
          req.defer.reject(new errors.Abort());
        });

        if (pendingRequests.length) {
          throw new Error('Aborting all pending requests failed.');
        }
      };
    }

    return new Courier();
  });
});