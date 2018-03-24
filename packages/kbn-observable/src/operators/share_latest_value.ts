import { MonoTypeOperatorFunction } from '../interfaces';
import { SubjectWithCurrentValue } from '../subjects';
import { Subscription, Observable } from '../observable';
import { filter } from '../operators';

const pendingValue = Symbol('awaiting first value');

/**
 * Some times we don't want to subscribe to the source observable multiple
 * times, e.g. when subscribing has side-effects or is expensive. For these
 * use-cases we want to share the underlying observable execution by only
 * subscribing once to the source observable.
 *
 * `shareLatestValue` only subscribes once to the underlying source observable,
 * and remembers the last value emitted by the source. Therefore, if a second
 * observer subscribes it will immediately receive the latest value from the
 * source, similarly to how a SubjectWithCurrentValue immediately sends the
 * current value on subscribe.
 *
 * If the `source` observable completes, then `shareLatestValue` will `complete`
 * all subscribed obsersers. However, if the `source` observable errors, a new
 * `subscribe` to `shareLatestValue` will create a new subscription to the
 * `source` observable.
 *
 * TODO: Mention it doesn't restart if subscriptions === 0.
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
 * const obs = source.pipe(shareLatestValue());
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
 */
export function shareLatestValue<T>(): MonoTypeOperatorFunction<T> {
  let subject: SubjectWithCurrentValue<T | typeof pendingValue>;

  // The number of observable currently subscribed and sharing the same
  // active subscription.
  let refCount = 0;

  // There is always either 0 or 1 active subscription. If that subscription
  // errors or completes, we need to create a new subscription the next time the
  // observable is subscribed to.
  let subscription: Subscription | undefined;
  let didSourceError = false;
  let didSourceComplete = false;

  return function shareLatestValueOperation(source) {
    return new Observable(observer => {
      refCount++;

      const shouldSubscribeToSource =
        subscription === undefined || didSourceError;

      if (subject === undefined || didSourceError) {
        didSourceError = false;

        subject = new SubjectWithCurrentValue<T | typeof pendingValue>(
          pendingValue
        );
      }

      const innerSub = subject
        .pipe(filter(value => value !== pendingValue))
        .subscribe(observer);

      if (shouldSubscribeToSource) {
        subscription = source.subscribe({
          next(value) {
            subject.next(value);
          },
          error(err) {
            didSourceError = true;
            subject.error(err);
          },
          complete() {
            didSourceComplete = true;
            subject.complete();
          },
        });
      }

      return () => {
        refCount--;

        innerSub.unsubscribe();

        if (subscription !== undefined && refCount === 0 && didSourceComplete) {
          subscription.unsubscribe();
        }
      };
    });
  };
}
