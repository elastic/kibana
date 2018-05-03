import { isSystemApiRequest } from '../../system_api';

export function initLoadingCountApi(chrome, internals) {
  const counts = { angular: 0, manual: 0 };
  const handlers = new Set();

  function getCount() {
    return counts.angular + counts.manual;
  }

  // update counts and call handlers with sum if there is a change
  function update(name, count) {
    if (counts[name] === count) {
      return;
    }

    counts[name] = count;
    for (const handler of handlers) {
      handler(getCount());
    }
  }

  /**
   * Injected into angular module by ui/chrome angular integration
   * and adds a root-level watcher that will capture the count of
   * active $http requests on each digest loop
   * @param  {Angular.Scope} $rootScope
   * @param  {HttpService} $http
   * @return {undefined}
   */
  internals.capture$httpLoadingCount = function ($rootScope, $http) {
    $rootScope.$watch(() => {
      const reqs = $http.pendingRequests || [];
      update('angular', reqs.filter(req => !isSystemApiRequest(req)).length);
    });
  };

  chrome.loadingCount = new class ChromeLoadingCountApi {
    /**
     * Call to add a subscriber to for the loading count that
     * will be called every time the loading count changes.
     *
     * @type {Observable<number>}
     * @return {Function} unsubscribe
     */
    subscribe(handler) {
      handlers.add(handler);

      // send the current count to the handler
      handler(getCount());

      return () => {
        handlers.delete(handler);
      };
    }

    /**
     * Increment the loading count by one
     * @return {undefined}
     */
    increment() {
      update('manual', counts.manual + 1);
    }

    /**
     * Decrement the loading count by one
     * @return {undefined}
     */
    decrement() {
      update('manual', counts.manual - 1);
    }
  };
}
