import { Observable, Subscription } from '../observable';

/**
 * Returns an Observable that mirrors the first source Observable to emit an
 * item.
 */
export function $race<T>(...observables: Observable<T>[]): Observable<T> {
  return new Observable(observer => {
    if (observables.length === 0) {
      observer.complete();
      return;
    }

    const subscriptions: Subscription[] = [];
    let chosenObs: Observable<T> | undefined;

    for (const observable of observables) {
      const subscription = observable.subscribe({
        next(x) {
          if (chosenObs === undefined) {
            chosenObs = observable;
          }

          if (observable === chosenObs) {
            observer.next(x);
          }
        },
        error(e) {
          if (chosenObs === undefined || observable === chosenObs) {
            observer.error(e);
          }
        },
        complete() {
          if (chosenObs === undefined || observable === chosenObs) {
            observer.complete();
          }
        },
      });

      subscriptions.push(subscription);
    }

    return () => {
      subscriptions.forEach(sub => {
        sub.unsubscribe();
      });
    };
  });
}
