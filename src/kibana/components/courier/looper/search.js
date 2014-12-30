define(function (require) {
  return function SearchLooperService(Private, Promise, Notifier) {
    var fetch = Private(require('components/courier/fetch/fetch'));
    var searchStrategy = Private(require('components/courier/fetch/strategy/search'));
    var requestQueue = Private(require('components/courier/_request_queue'));

    var Looper = Private(require('components/courier/looper/_looper'));
    var notif = new Notifier({ location: 'Search Looper' });

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var searchLooper = new Looper(null, function () {
      return fetch.these(
        requestQueue.getInactive(searchStrategy)
      );
    });

    searchLooper.onHastyLoop = function () {
      notif.warning('Skipping search attempt because previous search request has not completed');
    };

    return searchLooper;
  };
});