import { Observable } from '../Observable';
import { MonoTypeOperatorFunction } from '../interfaces';

/**
 * Filter items emitted by the source Observable by only emitting those that
 * satisfy a specified predicate.
 * 
 * @param predicate A function that evaluates each value emitted by the source
 * Observable. If it returns `true`, the value is emitted, if `false` the value
 * is not passed to the output Observable. The `index` parameter is the number
 * `i` for the i-th source emission that has happened since the subscription,
 * starting from the number `0`.
 * @return An Observable of values from the source that were allowed by the
 * `predicate` function.
 */
export function filter<T>(
  predicate: (value: T, index: number) => boolean
): MonoTypeOperatorFunction<T> {
  return function filterOperation(source) {
    return new Observable(observer => {
      let i = 0;

      return source.subscribe({
        next(value) {
          let result = false;
          try {
            result = predicate(value, i++);
          } catch (e) {
            observer.error(e);
            return;
          }
          if (result) {
            observer.next(value);
          }
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          observer.complete();
        }
      });
    });
  };
}
