define(function (require) {
  var _ = require('lodash');
  require('./data_source/doc');
  require('./data_source/search');
  require('./fetch/fetch');
  require('./errors');
  require('./looper');

  require('services/es');
  require('services/promises');

  var module = require('modules').get('courier');

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


        var processDocRequests = _.partial(fetch.docs, courier);
        var docInterval = new Looper().fn(processDocRequests);


        // track the currently executing search resquest
        var _activeAutoSearch = null;
        function processSearchRequests() {
          // fatal if refreshes take longer then the refresh interval
          if (_activeAutoSearch) Promise.rejected(new HastyRefresh());
          return _activeAutoSearch = fetch.searches(courier).finally(function (res) {
            _activeAutoSearch = null;
          });
        }
        var searchInterval = new Looper().fn(processSearchRequests);


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

        courier.start = function () {
          searchInterval.start();
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
         */
        courier.createSource = function (type) {
          switch (type) {
          case 'doc':
            return new DocSource(courier);
          case 'search':
            return new SearchSource(courier);
          }
        };
      }

      return new Courier();
    }
  ]);
});