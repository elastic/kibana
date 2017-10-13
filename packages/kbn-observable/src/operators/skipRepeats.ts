import { Observable } from '../Observable';
import { MonoTypeOperatorFunction } from '../interfaces';

const isStrictlyEqual = (a: any, b: any) => a === b;

/**
 * Returns an Observable that emits all items emitted by the source Observable
 * that are not equal to the previous item.
 * 
 * @param [equals] Optional comparison function called to test if an item is
 * equal to the previous item in the source. Should return `true` if equal,
 * otherwise `false`. By default compares using reference equality, aka `===`.
 * @return An Observable that emits items from the source Observable with
 * distinct values.
 */
export function skipRepeats<T>(
  equals: (x: T, y: T) => boolean = isStrictlyEqual
): MonoTypeOperatorFunction<T> {
  return function skipRepeatsOperation(source) {
    return new Observable(observer => {
      let hasInitialValue = false;
      let currentValue: T;

      return source.subscribe({
        next(value) {
          if (!hasInitialValue) {
            hasInitialValue = true;
            currentValue = value;
            observer.next(value);
            return;
          }

          const isEqual = equals(currentValue, value);

          if (!isEqual) {
            observer.next(value);
            currentValue = value;
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
