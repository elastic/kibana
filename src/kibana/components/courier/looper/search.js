define(function (require) {
  return function SearchLooperService(Private, Promise, Notifier) {
    var errors = require('errors');
    var fetch = Private(require('components/courier/fetch/fetch'));
    var Looper = Private(require('components/courier/looper/_looper'));

    // track the currently executing search resquest
    var _activeAutoSearch = null;

    var notif = new Notifier({ location: 'Search Looper' });

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var searchLooper = new Looper(null, function () {
      return Promise.all([fetch.searches(), fetch.segmentedSearches()]);
    });

    searchLooper.onHastyLoop = function () {
      notif.warning('Skipping search attempt because previous search request has not completed');
    };

    return searchLooper;
  };
});