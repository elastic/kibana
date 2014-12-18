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
      // fatal if refreshes take longer then the refresh interval
      if (_activeAutoSearch) {
        notif.warning('Skipping search attempt because previous search request has not completed');
        return;
      }

      return _activeAutoSearch = Promise.all([fetch.searches(), fetch.segmentedSearches()])
      .finally(function (res) {
        _activeAutoSearch = null;
      });
    }).start();

    return searchLooper;
  };
});