import { Observable } from '../observable';

export function $of<T>(...items: T[]): Observable<T> {
  return new Observable(observer => {
    for (const item of items) {
      observer.next(item);
    }

    observer.complete();
  });
}
