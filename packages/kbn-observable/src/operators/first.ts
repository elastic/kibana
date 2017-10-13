import { Observable } from '../Observable';
import { EmptyError } from '../errors';
import { MonoTypeOperatorFunction } from '../interfaces';

/**
 * Emits the first value emitted by the source Observable, then immediately
 * completes.
 * 
 * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
 * callback if the Observable completes before any `next` notification was sent.
 *
 * @returns An Observable of the first item received.
 */
export function first<T>(): MonoTypeOperatorFunction<T> {
  return function firstOperation(source) {
    return new Observable(observer => {
      return source.subscribe({
        next(value) {
          observer.next(value);
          observer.complete();
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          // The only time we end up here, is if we never received any values.
          observer.error(new EmptyError('first()'));
        }
      });
    });
  };
}
