import { Observable } from '../observable';
import { $fromIterable } from './from_iterable';

/**
 * Creates an Observable that emits each of the input arguments immediately one
 * after the other, and then completes.
 */
export function $of<T>(...items: T[]): Observable<T> {
  return $fromIterable(items);
}
