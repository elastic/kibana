import { Observable } from '../observable';
import { last } from './last';
import { scan } from './scan';
import { OperatorFunction, MonoTypeOperatorFunction } from '../interfaces';

/**
 * Applies the accumulator function to every value in the source observable and
 * emits the return value when the source completes.
 *
 * It's like {@link scan}, but only emits when the source observable completes,
 * not the current accumulation whenever the source emits a value.
 *
 * If no values are emitted, the `initialValue` will be emitted.
 *
 * @param accumulator The accumulator function called on each source value.
 * @param initialValue The initial accumulation value.
 * @return An Observable that emits a single value that is the result of
 * accumulating the values emitted by the source Observable.
 */
export function reduce<T, R>(
  accumulator: (acc: R, value: T, index: number) => R,
  initialValue: R
): OperatorFunction<T, R> {
  return function reduceOperation(source) {
    return source.pipe(
      scan(accumulator, initialValue),
      ifEmpty(initialValue),
      last()
    );
  };
}

function ifEmpty<T>(defaultValue: T): MonoTypeOperatorFunction<T> {
  return function ifEmptyOperation(source) {
    return new Observable(observer => {
      let hasReceivedValue = false;

      return source.subscribe({
        next(value) {
          hasReceivedValue = true;
          observer.next(value);
        },
        error(error) {
          observer.error(error);
        },
        complete() {
          if (!hasReceivedValue) {
            observer.next(defaultValue);
          }

          observer.complete();
        },
      });
    });
  };
}
