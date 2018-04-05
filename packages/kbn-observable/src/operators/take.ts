import { Observable } from '../observable';
import { MonoTypeOperatorFunction } from '../interfaces';

/**
 * Emits only the first `count` values emitted by the source Observable.
 *
 * If the source emits fewer than `count` values then all of its values are
 * emitted. After that, it completes, regardless if the source completes.
 */
export function take<T>(count: number): MonoTypeOperatorFunction<T> {
  return function takeOperation(source) {
    let i = 0;

    return new Observable(observer => {
      return source.subscribe({
        next(value) {
          observer.next(value);

          i += 1;

          if (i === count) {
            observer.complete();
          }
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          observer.complete();
        },
      });
    });
  };
}
