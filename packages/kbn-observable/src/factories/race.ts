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
          } else {
            subscription.unsubscribe();
          }
        },
        error(e) {
          if (chosenObs === undefined) {
            chosenObs = observable;
          }

          if (observable === chosenObs) {
            observer.error(e);
          } else {
            subscription.unsubscribe();
          }
        },
        complete() {
          if (chosenObs === undefined) {
            chosenObs = observable;
          }

          if (observable === chosenObs) {
            observer.complete();
          } else {
            subscription.unsubscribe();
          }
        },
      });

      subscriptions.push(subscription);
    }
  });
}
