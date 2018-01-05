import { FetchSoonProvider } from '../fetch';
import { requestQueue } from '../_request_queue';
import { LooperProvider } from './_looper';

export function SearchLooperProvider(Private, Promise, $rootScope) {
  const fetchSoon = Private(FetchSoonProvider);

  const Looper = Private(LooperProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const searchLooper = new Looper(null, function () {
    $rootScope.$broadcast('courier:searchRefresh');
    const requests = requestQueue.getInactive();
    // promise returned from fetch.these() only resolves when
    // the requests complete, but we want to continue even if
    // the requests abort so we make our own
    fetchSoon.these(requests);
    return Promise.all(requests.map(request => request.getCompleteOrAbortedPromise()));
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
}
