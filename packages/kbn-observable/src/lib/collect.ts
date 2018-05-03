import { Observable, PartialObserver } from '../observable';

/**
 * Test helper that collects all actions, and returns an array with all
 * `next`-ed values, plus any `error` received or a `C` if `complete` is
 * triggered.
 */
export function collect<T>(source: Observable<T>) {
  return new Promise(resolve => {
    const values: any[] = [];

    source.subscribe({
      next(x) {
        values.push(x);
      },
      error(err) {
        values.push(err);
        resolve(values);
      },
      complete() {
        values.push('C');
        resolve(values);
      },
    });
  });
}

export function createCollectObserver<T>(results: any[]): PartialObserver<T> {
  return {
    next(x) {
      results.push(x);
    },
    error(err) {
      results.push(err);
    },
    complete() {
      results.push('C');
    },
  };
}
