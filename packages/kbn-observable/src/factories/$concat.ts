import { Observable, Subscription } from '../Observable';

/**
 * Creates an observable that combines all observables passed as arguments into
 * a single output observable by subscribing to them in series, i.e. it will
 * subscribe to the next observable when the previous completes.
 *
 * @param {Observable...}
 * @return {Observable}
 */
export function $concat<T>(...observables: Observable<T>[]) {
  return new Observable(observer => {
    let subscription: Subscription | undefined;

    function subscribe(i: number) {
      if (observer.closed) {
        return;
      }

      if (i >= observables.length) {
        observer.complete();
      }

      subscription = observables[i].subscribe({
        next(value) {
          observer.next(value);
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          subscribe(i + 1);
        }
      });
    }

    subscribe(0);

    return function() {
      if (subscription !== undefined) {
        subscription.unsubscribe();
      }
    };
  });
}
