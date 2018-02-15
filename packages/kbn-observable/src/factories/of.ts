import { Observable } from '../Observable';

/**
 * Alias for `Observable.of`
 */
export function $of<T>(...items: T[]): Observable<T> {
  return Observable.of(...items);
}
