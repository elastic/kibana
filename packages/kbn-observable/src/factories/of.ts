import { Observable } from '../observable';
import { $fromIterable } from './from_iterable';

export function $of<T>(...items: T[]): Observable<T> {
  return $fromIterable(items);
}
