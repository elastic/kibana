import { Observable } from '../observable';

export function $error<E extends Error>(error: E) {
  return new Observable(observer => {
    observer.error(error);
  });
}
