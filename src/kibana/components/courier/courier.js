define(function (require) {
  var _ = require('lodash');
  require('./data_source/doc');
  require('./data_source/search');
  require('./fetch/fetch');
  require('./errors');
  require('./looper');

  require('services/es');
  require('services/promises');

  var module = require('modules').get('kibana/courier');

  module.service('courier', [
    'es',
    '$rootScope',
    'couriersFetch',
    'Promise',
    'Looper',
    'couriersErrors',
    'CouriersMapper',
    'CouriersDocSource',
    'CouriersSearchSource',
    function (client, $rootScope, fetch, Promise, Looper, errors, Mapper, DocSource, SearchSource) {
      var HastyRefresh = errors.HastyRefresh;

      function Courier() {
        var courier = this;
        courier.errors = errors;

        /**
         * Queue of pending requests, requests are removed as
         * they are processed by fetch.[sourceType]().
         * @type {Array}
         */
        courier._pendingRequests = [];

        /**
         * Queue of pending error handlers, they are removed as
         * they are resolved.
         * @type {Array}
         */
        courier._errorHandlers = [];

        /**
         * Fetch the docs
         * @type {function}
         */
        var processDocRequests = _.partial(fetch.docs, courier);

        /**
         * Fetch the search requests
         * @type {function}
         */
        var processSearchRequests = (function () {
          // track the currently executing search resquest
          var _activeAutoSearch = null;

          return function () {
            // fatal if refreshes take longer then the refresh interval
            if (_activeAutoSearch) Promise.rejected(new HastyRefresh());
            return _activeAutoSearch = fetch.searches(courier).finally(function (res) {
              _activeAutoSearch = null;
            });
          };
        }());

        /**
         * The Looper which will manage the doc fetch interval
         * @type {Looper}
         */
        var docInterval = new Looper().fn(processDocRequests).start();

        /**
         * The Looper which will manage the doc fetch interval
         * @type {Looper}
         */
        var searchInterval = new Looper().fn(processSearchRequests);

        /**
         * Instance of Mapper, helps dataSources figure out their fields
         * @type {Mapper}
         */
        courier._mapper = new Mapper(courier);

        /**
         * update the time between automatic search requests
         *
         * @chainable
         */
        courier.fetchInterval = function (ms) {
          searchInterval.ms(ms);
          return this;
        };

        /**
         * Start fetching search requests on an interval
         * @chainable
         */
        courier.start = function () {
          searchInterval.start();
          return this;
        };

        /**
         * Process the pending request queue right now, returns
         * a promise that resembles the success of the fetch completing,
         * individual errors are routed to their respectiv requests.
         */
        courier.fetch = function () {
          return processSearchRequests();
        };


        /**
         * is the currior currently fetching search
         * results automatically?
         *
         * @return {boolean}
         */
        courier.started = function () {
          return searchInterval.started();
        };


        /**
         * stop the courier from fetching more search
         * results, does not stop vaidating docs.
         *
         * @chainable
         */
        courier.stop = function () {
          searchInterval.stop();
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
            return new DocSource(courier);
          case 'search':
            return new SearchSource(courier);
          }
        };

        /**
         * Abort all pending requests
         * @return {[type]} [description]
         */
        courier.close = function () {
          this._pendingRequests.splice(0).forEach(function (req) {
            req.defer.reject(new errors.Abort());
          });

          if (this._pendingRequests.length) {
            throw new Error('Aborting all pending requests failed.');
          }
        };
      }

      return new Courier();
    }
  ]);
});