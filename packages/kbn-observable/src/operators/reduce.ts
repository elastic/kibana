import { last } from './last';
import { scan } from './scan';
import { ifEmpty } from './ifEmpty';
import { pipe } from '../lib';
import { OperatorFunction } from '../interfaces';

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
    return pipe(
      scan(accumulator, initialValue),
      ifEmpty(() => initialValue),
      last()
    )(source);
  };
}
