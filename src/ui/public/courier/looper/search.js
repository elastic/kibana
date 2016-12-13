import FetchProvider from '../fetch';
import SearchStrategyProvider from '../fetch/strategy/search';
import RequestQueueProvider from '../_request_queue';
import LooperProvider from './_looper';

export default function SearchLooperService(Private, Promise, Notifier, $rootScope) {
  const fetch = Private(FetchProvider);
  const searchStrategy = Private(SearchStrategyProvider);
  const requestQueue = Private(RequestQueueProvider);

  const Looper = Private(LooperProvider);
  const notif = new Notifier({ location: 'Search Looper' });

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const searchLooper = new Looper(null, function () {
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
