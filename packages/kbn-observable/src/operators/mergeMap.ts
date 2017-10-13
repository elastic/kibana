import { Observable, ObservableInput } from '../Observable';
import { OperatorFunction } from '../interfaces';
import { $from } from '../factories';

export function mergeMap<T, R>(
  project: (value: T, index: number) => ObservableInput<R>
): OperatorFunction<T, R>;
export function mergeMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector: (
    outerValue: T,
    innerValue: I,
    outerIndex: number,
    innerIndex: number
  ) => R
): OperatorFunction<T, R>;

/**
 * Projects each source value to an Observable which is merged in the output
 * Observable.
 * 
 * Example:
 * 
 * ```js
 * const source = Observable.from([1, 2, 3]);
 * const observable = k$(source)(
 *   mergeMap(x => Observable.of('a', x + 1))
 * );
 * ```
 * 
 * Results in the following items emitted:
 * - a
 * - 2
 * - a
 * - 3
 * - a
 * - 4
 * 
 * As you can see it merges the returned observable and emits every value from
 * that observable. You can think of it as being the same as `flatMap` on an
 * array, just that you return an Observable instead of an array.
 *
 * You can also specify a `resultSelector` that will receive both the value
 * emitted from the `source` observable and the value returned from the provided
 * `project` function, e.g.
 * 
 * ```js
 * mergeMap(
 *  pluginName => readPluginConfig$(pluginName),
 *  (pluginName, pluginConfig) => {
 *    return { pluginName, pluginConfig }
 *  }
 * )
 * ```
 * 
 * In the `resultSelector` you receive both `pluginName`, which was the value
 * emitted by the source observable, and `pluginConfig`, which was the value
 * emitted by `readPluginConfig$`.
 * 
 * More "formally" described: Returns an Observable that emits items based on
 * applying a function that you supply (the `resultSelector`) to each item
 * emitted by the source Observable, where that function returns an Observable,
 * and then merging those resulting Observables and emitting the results of
 * this merger.
 *
 * @param project A function that, when applied to an item emitted by the source
 * Observable, returns an Observable.
 * @param resultSelector A function to produce the value on the output
 * Observable based on the values and the indices of the source (outer) emission
 * and the inner Observable emission. The arguments passed to this function are:
 * 
 * - `outerValue`: the value that came from the source
 * - `innerValue`: the value that came from the projected Observable
 * - `outerIndex`: the "index" of the value that came from the source
 * - `innerIndex`: the "index" of the value from the projected Observable
 */
export function mergeMap<T, I, R>(
  project: (value: T, index: number) => ObservableInput<I>,
  resultSelector?: ((
    outerValue: T,
    innerValue: I,
    outerIndex: number,
    innerIndex: number
  ) => R)
): OperatorFunction<T, I | R> {
  return function mergeMapOperation(source) {
    return new Observable(destination => {
      let completed = false;
      let active = 0;
      let i = 0;

      source.subscribe({
        next(value) {
          const outerIndex = i;
          let result;
          try {
            result = project(value, i++);
          } catch (error) {
            destination.error(error);
            return;
          }
          active++;

          let innerIndex = 0;

          $from(result).subscribe({
            next(innerValue) {
              let result: R | I = innerValue;

              if (resultSelector !== undefined) {
                try {
                  result = resultSelector(
                    value,
                    innerValue,
                    outerIndex,
                    innerIndex
                  );
                } catch (err) {
                  destination.error(err);
                  return;
                }
                innerIndex++;
              }

              destination.next(result);
            },
            error(err) {
              destination.error(err);
            },
            complete() {
              active--;

              if (active === 0 && completed) {
                destination.complete();
              }
            }
          });
        },

        error(err) {
          destination.error(err);
        },

        complete() {
          completed = true;
          if (active === 0) {
            destination.complete();
          }
        }
      });
    });
  };
}
