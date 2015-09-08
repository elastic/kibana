define(function (require) {
  return function SearchLooperService(Private, Promise, Notifier, $rootScope) {
    var fetch = Private(require('ui/courier/fetch/fetch'));
    var searchStrategy = Private(require('ui/courier/fetch/strategy/search'));
    var requestQueue = Private(require('ui/courier/_request_queue'));

    var Looper = Private(require('ui/courier/looper/_looper'));
    var notif = new Notifier({ location: 'Search Looper' });

    /**
     * The Looper which will manage the doc fetch interval
     * @type {Looper}
     */
    var searchLooper = new Looper(null, function () {
      $rootScope.$broadcast('courier:searchRefresh');
      return fetch.these(
        requestQueue.getInactive(searchStrategy)
      );
    });

    searchLooper.onHastyLoop = function () {
      if (searchLooper.afterHastyQueued) return;

      searchLooper.afterHastyQueued = Promise.resolve(searchLooper.active)
      .then(function () {
        return searchLooper._loopTheLoop();
      })
      .finally(function () {
        searchLooper.afterHastyQueued = null;
      });
    };

    return searchLooper;
  };
});
