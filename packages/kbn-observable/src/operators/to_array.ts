import { Observable } from '../Observable';
import { reduce } from './reduce';
import { OperatorFunction } from '../interfaces';

function concat<T>(source: Observable<T>) {
  return reduce<T, T[]>((acc, item) => acc.concat([item]), [] as T[])(source);
}

/**
 * Modify a stream to produce a single array containing all of the items emitted
 * by source.
 */
export function toArray<T>(): OperatorFunction<T, T[]> {
  return function toArrayOperation(source) {
    return concat(source);
  };
}
