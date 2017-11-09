import { Observable } from '../Observable';
import { OperatorFunction } from '../interfaces';

/**
 * Applies the accumulator function to every value in the source stream and
 * emits the return value of each invocation.
 * 
 * It's like {@link reduce}, but emits the current accumulation whenever the
 * source emits a value instead of emitting only when completed.
 * 
 * @param accumulator The accumulator function called on each source value.
 * @param initialValue The initial accumulation value.
 * @return An observable of the accumulated values.
 */
export function scan<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  initialValue: R
): OperatorFunction<T, R> {
  return function scanOperation(source) {
    return new Observable(observer => {
      let i = -1;
      let acc = initialValue;

      return source.subscribe({
        next(value) {
          i += 1;

          try {
            acc = accumulator(acc, value, i);

            observer.next(acc);
          } catch (error) {
            observer.error(error);
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
