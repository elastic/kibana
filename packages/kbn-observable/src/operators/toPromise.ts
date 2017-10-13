import { Observable } from '../Observable';
import { UnaryFunction } from '../interfaces';

export function toPromise<T>(): UnaryFunction<Observable<T>, Promise<T>> {
  return function toPromiseOperation(source) {
    return new Promise((resolve, reject) => {
      let lastValue: T;

      source.subscribe({
        next(value) {
          lastValue = value;
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(lastValue);
        }
      });
    });
  };
}
