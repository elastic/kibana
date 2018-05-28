import { UnaryFunction } from '../interfaces';
import { Observable } from '../observable';

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
        },
      });
    });
  };
}
