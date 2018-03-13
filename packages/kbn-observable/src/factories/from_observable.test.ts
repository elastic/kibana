import symbolObservable from 'symbol-observable';
import { Observable as RxObservable } from 'rxjs';

import { Observable } from '../observable';
import { $fromObservable } from './from_observable';

const noop = () => {};

test('handles object with Symbol.observable method', () => {
  let called = 0;
  $fromObservable({
    [symbolObservable]() {
      called++;
      return {
        subscribe() {},
      };
    },
  } as any).subscribe();

  expect(called).toBe(1);
});

test('throws if the return value of Symbol.observable method is not an object', () => {
  expect(() => {
    $fromObservable({
      [symbolObservable]() {
        return 0;
      },
    } as any);
  }).toThrow(TypeError);

  expect(() => {
    $fromObservable({
      [symbolObservable]() {
        return null;
      },
    } as any);
  }).toThrow(TypeError);

  expect(() => {
    $fromObservable({
      [symbolObservable]() {},
    } as any);
  }).toThrow(TypeError);
});

test('throws if return value of Symbol.observable method is an object with no subscribe', () => {
  expect(() => {
    $fromObservable({
      [symbolObservable]() {
        return {};
      },
    } as any);
  }).toThrow(TypeError);
});

test('does not call subscribe on result of calling the Symbol.observable method', () => {
  const spy = jest.fn();

  $fromObservable({
    [symbolObservable]() {
      return {
        subscribe: spy,
      };
    },
  } as any);

  expect(spy).not.toHaveBeenCalled();
});

test('returns observable itself', () => {
  const obs = new Observable(noop);

  expect($fromObservable(obs)).toBe(obs);
});

test('throws for "null"', () => {
  expect(() => {
    $fromObservable(null as any);
  }).toThrow(TypeError);
});

test('throws for "undefined"', () => {
  expect(() => {
    $fromObservable(undefined as any);
  }).toThrow(TypeError);
});

test('throws if no argument specified', () => {
  expect(() => {
    ($fromObservable as any)();
  }).toThrow(TypeError);
});

describe('from rxjs observable', () => {
  test('passes through all values', () => {
    const observable = RxObservable.from([1, 2, 3]);
    const kbnObservable = $fromObservable<number>(observable as any);

    const arr: number[] = [];
    kbnObservable.subscribe(val => {
      arr.push(val);
    });

    expect(arr).toEqual([1, 2, 3]);
  });

  test('handles completed', () => {
    const observable = RxObservable.empty();
    const kbnObservable = $fromObservable(observable as any);

    let completed = false;
    kbnObservable.subscribe({
      complete: () => {
        completed = true;
      },
    });

    expect(completed).toBe(true);
  });

  test('handles error', () => {
    const err = new Error('err');
    const observable = RxObservable.throw(err);

    const kbnObservable = $fromObservable(observable as any);

    let receivedError = undefined;
    kbnObservable.subscribe({
      error: err => {
        receivedError = err;
      },
    });

    expect(receivedError).toBe(err);
  });

  test('can transform to new rxjs observable', async () => {
    const observable = RxObservable.from([1, 2, 3]);
    const rxObservable = RxObservable.from($fromObservable(observable as any));

    const arr = await rxObservable.toArray().toPromise();

    expect(arr).toEqual([1, 2, 3]);
  });
});
