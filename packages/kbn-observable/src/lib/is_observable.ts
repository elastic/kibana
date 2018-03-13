import { Observable } from '../observable';

export function isObservable<T>(x: any): x is Observable<T> {
  return (
    x != null &&
    typeof x === 'object' &&
    typeof x[Symbol.observable] === 'function'
  );
}
