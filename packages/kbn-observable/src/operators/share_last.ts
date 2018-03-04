import { Observable as RxObservable } from 'rxjs';

import { MonoTypeOperatorFunction } from '../interfaces';
import { rxjsToEsObservable } from '../lib';

/**
 * Some times we don't want to subscribe to the source observable multiple
 * times, e.g. when subscribing has side-effects or is expensive. For these
 * use-cases we want to share the underlying observable execution by only
 * subscribing once to the source observable.
 *
 * `shareLast` only subscribes once to the underlying source observable, and
 * remembers the last value emitted by the source. Therefore, if a second
 * observer subscribes it will immediately receive the latest value from the
 * source, similarly to how a BehaviorSubject immediately sends the current
 * value on subscribe.
 *
 * When all subscribers unsubscribe, the shared subscription on the source
 * observable will be unsubscribed. Later on if there is a new subscription, a
 * new subscription will be made on the source observable. The subscription flow
 * explained in code:
 *
 * ```
 * const source = new Observable(observer => {
 *   // do expensive work
 *   observer.next(someValue);
 * });
 *
 * const obs = k$(source)(shareLast(1));
 *
 * // This `subscribe` will make `obs` subscribe to the `source` observable
 * const sub1 = obs.subscribe({
 *   next(value) {
 *     console.log(1, value);
 *   }
 * });
 *
 * // This `subscribe` will share the same subscription as `sub1` to the
 * // `source` observable instead of creating a new execution.
 * const sub2 = obs.subscribe({
 *   next(value) {
 *     console.log(2, value);
 *   }
 * });
 *
 * // After this `unsubscribe` the subscription initialized by `sub1` above will
 * // still "be open" as `sub2` hasn't unsubscribed yet. If the `source` sends
 * // new values they will still be received by `sub2`, but no longer by `sub1`
 * // as soon as it's unsubscribed.
 * sub1.unsubscribe();
 *
 * // This will cause an `unsubscribe` to the `source` observable as this is the
 * // last subscription to the shared observable execution.
 * sub2.unsubscribe();
 *
 * // This will initiate a new `subscribe` to the `source` observable.
 * const sub3 = obs.subscribe({
 *   next(value) {
 *     console.log(3, value);
 *   }
 * });
 * ```
 *
 * **NOTE** This depends on RxJS directly just for a simpler implementation in
 * the short-term, and not because of some other overlying strategy. The
 * intention is to move this to a "home-made" implementation, so we can remove
 * the direct RxJS dependency.
 */
export function shareLast<T>(): MonoTypeOperatorFunction<T> {
  return function shareLastOperation(source) {
    return rxjsToEsObservable(RxObservable.from(source).shareReplay(1));
  };
}
