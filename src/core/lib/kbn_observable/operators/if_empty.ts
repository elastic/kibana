import { $fromCallback } from '../factories';
import { MonoTypeOperatorFunction } from '../interfaces';
import { Observable } from '../observable';

/**
 * Modifies a stream so that when the source completes without emitting any
 * values a new observable is created via `factory()` (see `$fromCallback`) that
 * will be mirrored to completion.
 *
 * @param factory
 * @return
 */
export function ifEmpty<T>(factory: () => T): MonoTypeOperatorFunction<T> {
  return function ifEmptyOperation(source) {
    return new Observable(observer => {
      let hasReceivedValue = false;

      const subs = [
        source.subscribe({
          next(value) {
            hasReceivedValue = true;
            observer.next(value);
          },
          error(error) {
            observer.error(error);
          },
          complete() {
            if (hasReceivedValue) {
              observer.complete();
            } else {
              subs.push($fromCallback(factory).subscribe(observer));
            }
          },
        }),
      ];

      return function() {
        subs.forEach(sub => sub.unsubscribe());
        subs.length = 0;
      };
    });
  };
}
