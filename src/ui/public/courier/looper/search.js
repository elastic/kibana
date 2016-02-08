import CourierFetchFetchProvider from 'ui/courier/fetch/fetch';
import CourierFetchStrategySearchProvider from 'ui/courier/fetch/strategy/search';
import CourierRequestQueueProvider from 'ui/courier/_request_queue';
import CourierLooperLooperProvider from 'ui/courier/looper/_looper';

export default function SearchLooperService(Private, Promise, Notifier, $rootScope) {
  var fetch = Private(CourierFetchFetchProvider);
  var searchStrategy = Private(CourierFetchStrategySearchProvider);
  var requestQueue = Private(CourierRequestQueueProvider);

  var Looper = Private(CourierLooperLooperProvider);
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
