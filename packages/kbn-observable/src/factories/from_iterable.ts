import { Observable } from '../observable';

function isIterable<T>(obj: any): obj is Iterable<T> {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

/**
 * Create an observable from an iterable
 */
export function $fromIterable<T>(x: Iterable<T>): Observable<T> {
  if (!isIterable(x)) {
    throw new TypeError(`${x} is not iterable`);
  }

  return new Observable<T>(observer => {
    for (let item of x) {
      if (observer.closed) return;
      observer.next(item);
    }

    observer.complete();
  });
}
