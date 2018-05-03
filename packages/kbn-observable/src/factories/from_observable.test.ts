import { Observable as RxObservable } from 'rxjs';

import { Observable } from '../observable';
import { $fromObservable } from './from_observable';

const noop = () => {};

test('handles object with Symbol.observable method', () => {
  let called = 0;
  $fromObservable({
    [Symbol.observable]() {
      called++;
      return {
        subscribe() {
          return {
            unsubscribe: noop,
          };
        },
      };
    },
  }).subscribe();

  expect(called).toBe(1);
});

test('throws if the return value of Symbol.observable method is not an object', () => {
  expect(() => {
    $fromObservable({
      [Symbol.observable]() {
        return 0;
      },
    } as any);
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    $fromObservable({
      [Symbol.observable]() {
        return null;
      },
    } as any);
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    $fromObservable({
      [Symbol.observable]() {},
    } as any);
  }).toThrowErrorMatchingSnapshot();
});

test('throws if return value of Symbol.observable method is an object with no subscribe', () => {
  expect(() => {
    $fromObservable({
      [Symbol.observable]() {
        return {} as any;
      },
    });
  }).toThrowErrorMatchingSnapshot();
});

test('does not call subscribe on result of calling the Symbol.observable method', () => {
  const spy = jest.fn();

  $fromObservable({
    [Symbol.observable]() {
      return {
        subscribe: spy,
      };
    },
  });

  expect(spy).not.toHaveBeenCalled();
});

test('returns observable itself', () => {
  const obs = new Observable(noop);

  expect($fromObservable(obs)).toBe(obs);
});

test('throws for "null"', () => {
  expect(() => {
    $fromObservable(null as any);
  }).toThrowErrorMatchingSnapshot();
});

test('throws for "undefined"', () => {
  expect(() => {
    $fromObservable(undefined as any);
  }).toThrowErrorMatchingSnapshot();
});

test('throws if no argument specified', () => {
  expect(() => {
    ($fromObservable as any)();
  }).toThrowErrorMatchingSnapshot();
});

describe('from rxjs observable', () => {
  test('passes through all values', () => {
    const observable = RxObservable.from([1, 2, 3]);
    const kbnObservable = $fromObservable<number>(observable);

    const arr: number[] = [];
    kbnObservable.subscribe(val => {
      arr.push(val);
    });

    expect(arr).toEqual([1, 2, 3]);
  });

  test('handles completed', () => {
    const observable = RxObservable.empty();
    const kbnObservable = $fromObservable(observable);

    const complete = jest.fn();

    kbnObservable.subscribe({ complete });

    expect(complete).toHaveBeenCalledTimes(1);
  });

  test('handles error', () => {
    const err = new Error('err');
    const observable = RxObservable.throw(err);

    const kbnObservable = $fromObservable(observable);

    const error = jest.fn();

    kbnObservable.subscribe({ error });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenLastCalledWith(err);
  });

  test('can transform to new rxjs observable', async () => {
    const observable = RxObservable.from([1, 2, 3]);
    const rxObservable = RxObservable.from($fromObservable(observable));

    const arr = await rxObservable.toArray().toPromise();

    expect(arr).toEqual([1, 2, 3]);
  });
});
