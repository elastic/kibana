import { Observable } from '../observable';

/**
 * Alias for `Observable.of`
 */
export function $of<T>(...items: T[]): Observable<T> {
  return Observable.of(...items);
}
