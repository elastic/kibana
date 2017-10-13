import { Observable } from '../Observable';
import { EmptyError } from '../errors';
import { MonoTypeOperatorFunction } from '../interfaces';

/**
 * Emits the last value emitted by the source Observable, then immediately
 * completes.
 * 
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 * 
 * @returns An Observable of the last item received.
 */
export function last<T>(): MonoTypeOperatorFunction<T> {
  return function lastOperation(source) {
    return new Observable(observer => {
      let hasReceivedValue = false;
      let latest: T;

      return source.subscribe({
        next(value) {
          hasReceivedValue = true;
          latest = value;
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          if (hasReceivedValue) {
            observer.next(latest);
            observer.complete();
          } else {
            observer.error(new EmptyError('last()'));
          }
        }
      });
    });
  };
}
