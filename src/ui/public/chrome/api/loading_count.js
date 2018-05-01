import { Observable, BehaviorSubject } from 'rxjs';

import { isSystemApiRequest } from '../../system_api';

export function initLoadingCountApi(chrome, internals) {
  const angularCount$ = new BehaviorSubject(0);
  const manualCount$ = new BehaviorSubject(0);

  /**
   * Injected into angular module by ui/chrome angular integration
   * and adds a root-level watcher that will capture the count of
   * active $http requests on each digest loop
   * @param  {} $rootScope
   * @param  {[type]} $http      [description]
   * @return {[type]}            [description]
   */
  internals.capture$httpLoadingCount = function ($rootScope, $http) {
    $rootScope.$watch(() => {
      const reqs = $http.pendingRequests || [];
      angularCount$.next(reqs.filter(req => !isSystemApiRequest(req)).length);
    });
  };

  chrome.loadingCount = new class ChromeLoadingCountApi {
    /**
     * Observable of count of loading items, powers the
     * loading indicator directive
     * @type {Observable<number>}
     */
    count$ = Observable
      .combineLatest(manualCount$, angularCount$)
      .map((counts) => counts[0] + counts[1])
      .distinctUntilChanged()
      .share()

    /**
     * Increment the loading count by one
     * @return {undefined}
     */
    increment() {
      manualCount$.next(manualCount$.getValue() + 1);
    }

    /**
     * Decrement the loading count by one
     * @return {undefined}
     */
    decrement() {
      manualCount$.next(manualCount$.getValue() - 1);
    }
  };
}
