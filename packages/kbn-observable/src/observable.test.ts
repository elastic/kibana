import symbolObservable from 'symbol-observable';

import { Observable, SubscriptionObserver } from './observable';
import { OperatorFunction, MonoTypeOperatorFunction } from './interfaces';
import { $of } from './factories';

const noop = () => {};

describe('constructor', () => {
  test('cannot be called as a function', () => {
    // to avoid TypeScript error below when used incorrectly
    const O = Observable as any;

    expect(() => O(noop)).toThrowErrorMatchingSnapshot();
  });

  test('the first argument cannot be a non-callable object', () => {
    // to avoid TypeScript error below when used incorrectly
    const O = Observable as any;

    expect(() => new O({})).toThrowErrorMatchingSnapshot();
  });

  test('the first argument cannot be a primitive value', () => {
    // to avoid TypeScript error below when used incorrectly
    const O = Observable as any;

    expect(() => new O(true)).toThrowErrorMatchingSnapshot();
    expect(() => new O(null)).toThrowErrorMatchingSnapshot();
    expect(() => new O(undefined)).toThrowErrorMatchingSnapshot();
    expect(() => new O(1)).toThrowErrorMatchingSnapshot();
  });

  test('the first argument can be a function', () => {
    expect(() => new Observable(noop)).not.toThrowError();
  });

  test('subscriber function is not called by constructor', () => {
    const subscriberFn = jest.fn();

    new Observable(subscriberFn);

    expect(subscriberFn).not.toHaveBeenCalled();
  });
});

describe('subscriber function', () => {
  test('can return "undefined"', () => {
    const source = new Observable(() => undefined);
    expect(() => {
      source.subscribe();
    }).not.toThrowError();
  });

  test('can return a function', () => {
    const source = new Observable(() => noop);
    expect(() => {
      source.subscribe();
    }).not.toThrowError();
  });

  test('can return a subscription', () => {
    const source = new Observable(() => new Observable(noop).subscribe());
    expect(() => {
      source.subscribe();
    }).not.toThrowError();
  });

  test('throws if returning "null"', () => {
    const source = new Observable(() => null as any);
    expect(() => {
      source.subscribe();
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws if returning a primitive', () => {
    const source = new Observable(() => 0 as any);
    expect(() => {
      source.subscribe();
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws if returning a boolean', () => {
    const source = new Observable(() => false as any);
    expect(() => {
      source.subscribe();
    }).toThrowErrorMatchingSnapshot();
  });

  test('throws if returning an object', () => {
    const source = new Observable(() => ({} as any));
    expect(() => {
      source.subscribe();
    }).toThrowErrorMatchingSnapshot();
  });
});

describe('#subscribe', () => {
  test('calls the subscriber function with a subscription observer', async () => {
    const subscriberFn = jest.fn();

    const source = new Observable(subscriberFn);

    source.subscribe();

    expect(subscriberFn).toHaveBeenCalledTimes(1);

    const args = subscriberFn.mock.calls[0];
    const subscriptionObserver = args[0];

    expect(subscriptionObserver).toEqual(
      expect.objectContaining({
        next: expect.any(Function),
        error: expect.any(Function),
        complete: expect.any(Function),
      })
    );
  });

  test('returns a subscription object', () => {
    const source = new Observable(noop);

    const subscription = source.subscribe();

    expect(typeof subscription).toBe('object');
    expect(typeof subscription.unsubscribe).toBe('function');
    expect(subscription.closed).toBe(false);
  });

  test('can specify "next" function', () => {
    let observer!: SubscriptionObserver<string>;
    const values: string[] = [];

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe(x => {
      values.push(x);
    });

    observer.next('foo');

    expect(values).toEqual(['foo']);

    observer.next('bar');

    expect(values).toEqual(['foo', 'bar']);
  });

  test('throws if more than one argument is specified', () => {
    const source = new Observable(noop);

    // to avoid TypeScript error below when used incorrectly
    const subscribe = source.subscribe as any;

    expect(() => {
      subscribe(noop, noop);
    }).toThrowErrorMatchingSnapshot();
  });

  test('triggers complete when observer is completed', async () => {
    let observer!: SubscriptionObserver<any>;

    const source = new Observable(_observer => {
      observer = _observer;
    });

    const next = jest.fn();
    const error = jest.fn();
    const complete = jest.fn();

    source.subscribe({ next, error, complete });

    observer.complete();

    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  test('should send errors thrown in the constructor down the error path', async () => {
    const err = new Error('this should be handled');

    const source = new Observable(observer => {
      throw err;
    });

    const error = jest.fn();

    source.subscribe({
      error,
    });

    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(err);
  });

  test('does not throw if errors are not handled', async () => {
    const source = new Observable(observer => {
      throw new Error('this should be handled');
    });

    expect(() => {
      source.subscribe();
    }).not.toThrowError();
  });
});

describe('SubscriptionObserver#next', () => {
  test('input value is forwarded to the observer', () => {
    let observer!: SubscriptionObserver<string>;
    const values: string[] = [];

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      next(x) {
        values.push(x);
      },
    });

    observer.next('foo');

    expect(values).toEqual(['foo']);

    observer.next('bar');

    expect(values).toEqual(['foo', 'bar']);
  });

  test('it does not forward additional arguments', () => {
    let observer!: SubscriptionObserver<string>;
    let observerArgs: any;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      next(...args: any[]) {
        observerArgs = args;
      },
    });

    (observer as any).next('foo', 'bar', 'baz');

    expect(observerArgs).toEqual(['foo']);
  });

  test('suppresses the value returned from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      next(...args: any[]) {
        return 'bar';
      },
    });

    expect(observer.next('foo')).toBe(undefined);
  });

  test('catches errors thrown from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      next(...args: any[]) {
        throw new Error('thrown from next');
      },
    });

    expect(observer.next('foo')).toBe(undefined);
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });

  test('can call "next" on observer when no "next" is defined when subscribed', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe();

    expect(observer.next('foo')).toBe(undefined);
  });

  test('does not call "next" after "complete" is called', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    const values: any[] = [];

    source.subscribe({
      next() {
        values.push('next');
      },
      complete() {
        values.push('complete');
      },
    });

    observer.next('foo');
    observer.complete();
    observer.next('bar');

    expect(values).toEqual(['next', 'complete']);
  });

  test('subscription is not closed when next throws an error', () => {
    let observer!: SubscriptionObserver<string>;
    const cleanup = jest.fn();

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
      return cleanup;
    });

    source.subscribe({
      next() {
        throw new Error('thrown from next');
      },
    });

    observer.next('foo');

    expect(cleanup).not.toHaveBeenCalled();
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });
});

describe('SubscriptionObserver#error', () => {
  test('input value is forwarded to the observer', () => {
    let observer!: SubscriptionObserver<string>;
    const values: any[] = [];

    const source = new Observable<any>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      error(x) {
        values.push(x);
      },
    });

    const err = new Error('foo');

    observer.error(err);

    expect(values).toEqual([err]);
  });

  test('it does not forward additional arguments', () => {
    let observer!: SubscriptionObserver<string>;
    let observerArgs: any;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      error(...args: any[]) {
        observerArgs = args;
      },
    });

    (observer as any).error('foo', 'bar', 'baz');

    expect(observerArgs).toEqual(['foo']);
  });

  test('suppresses the value returned from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      error(...args: any[]) {
        return 'bar';
      },
    });

    expect(observer.error(new Error('foo'))).toBe(undefined);
  });

  test('catches errors thrown from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      error(...args: any[]) {
        throw new Error('thrown from error');
      },
    });

    expect(observer.error(new Error('foo'))).toBe(undefined);
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });

  test('can call "error" on observer when no "error" is defined when subscribed', () => {
    let observer!: SubscriptionObserver<string>;
    const cleanup = jest.fn();

    const source = new Observable<string>(_observer => {
      observer = _observer;
      return cleanup;
    });

    source.subscribe();

    expect(observer.error(new Error('foo'))).toBe(undefined);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('does not call "error" after "complete" is called', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    const values: any[] = [];

    source.subscribe({
      error() {
        values.push('error');
      },
      complete() {
        values.push('complete');
      },
    });

    observer.complete();
    observer.error(new Error('bar'));

    expect(values).toEqual(['complete']);
  });

  test('does not call "error" multiple times', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    const error = jest.fn();

    source.subscribe({ error });

    const err = new Error('foo');
    observer.error(err);
    observer.error(new Error('bar'));

    expect(error).toHaveBeenCalledTimes(1);
  });

  test('cleanup function is called when method throws', () => {
    let observer!: SubscriptionObserver<string>;
    const cleanup = jest.fn();

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
      return cleanup;
    });

    source.subscribe({
      error() {
        throw new Error('thrown from error');
      },
    });

    observer.error(new Error('foo'));

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });
});

describe('SubscriptionObserver#complete', () => {
  test('it does not forward arguments', () => {
    let observer!: SubscriptionObserver<string>;
    let observerArgs: any;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      complete(...args: any[]) {
        observerArgs = args;
      },
    });

    (observer as any).complete('foo', 'bar', 'baz');

    expect(observerArgs).toEqual([]);
  });

  test('suppresses the value returned from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      complete() {
        return 'bar';
      },
    });

    expect(observer.complete()).toBe(undefined);
  });

  test('catches errors thrown from the observer', () => {
    let observer!: SubscriptionObserver<string>;

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    source.subscribe({
      complete() {
        throw new Error('thrown from complete');
      },
    });

    expect(observer.complete()).toBe(undefined);
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });

  test('can call "complete" on observer when no "complete" is defined when subscribed', () => {
    let observer!: SubscriptionObserver<string>;
    const cleanup = jest.fn();

    const source = new Observable<string>(_observer => {
      observer = _observer;
      return cleanup;
    });

    source.subscribe();

    expect(observer.complete()).toBe(undefined);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('does not call "complete" multiple times', () => {
    let observer!: SubscriptionObserver<string>;

    const source = new Observable<string>(_observer => {
      observer = _observer;
    });

    const complete = jest.fn();

    source.subscribe({ complete });

    observer.complete();
    observer.complete();

    expect(complete).toHaveBeenCalledTimes(1);
  });

  test('cleanup function is called when method throws', () => {
    let observer!: SubscriptionObserver<string>;
    const cleanup = jest.fn();

    const consoleError = jest.spyOn(console, 'error');
    consoleError.mockImplementation(noop);

    const source = new Observable<string>(_observer => {
      observer = _observer;
      return cleanup;
    });

    source.subscribe({
      complete() {
        throw new Error('thrown from complete');
      },
    });

    observer.complete();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls).toMatchSnapshot('logs');

    consoleError.mockRestore();
  });

  test('does not call "complete" on unsubscribe', () => {
    const complete = jest.fn();

    const source = new Observable(() => {});

    source.subscribe({ complete }).unsubscribe();

    expect(complete).not.toHaveBeenCalled();
  });
});

describe('SubscriptionObserver#closed', () => {
  test('returns false when the subscription is active', () => {
    let isClosed;

    new Observable(observer => {
      isClosed = observer.closed;
    }).subscribe();

    expect(isClosed).toBe(false);
  });

  test('returns true when observer is completed', () => {
    let isClosed;

    new Observable(observer => {
      observer.complete();

      isClosed = observer.closed;
    }).subscribe();

    expect(isClosed).toBe(true);
  });

  test("returns true when observer has error'd", () => {
    let isClosed;

    new Observable(observer => {
      observer.error(new Error('foo'));

      isClosed = observer.closed;
    }).subscribe();

    expect(isClosed).toBe(true);
  });

  test('returns true after unsubscribe is called', () => {
    let observer!: SubscriptionObserver<any>;

    new Observable(_observer => {
      observer = _observer;
    })
      .subscribe()
      .unsubscribe();

    expect(observer.closed).toBe(true);
  });
});

describe('subscriptions', () => {
  test('calls the cleanup function on unsubscribe', () => {
    const cleanup = jest.fn();

    const source = new Observable(() => {
      return cleanup;
    });

    source.subscribe().unsubscribe();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('does not call the cleanup multiple times', () => {
    const cleanup = jest.fn();

    const source = new Observable(() => {
      return cleanup;
    });

    const sub = source.subscribe();
    sub.unsubscribe();
    sub.unsubscribe();
    sub.unsubscribe();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('calls the cleanup function on "error"', () => {
    const cleanup = jest.fn();
    let observer!: SubscriptionObserver<any>;

    const source = new Observable(_observer => {
      observer = _observer;

      return cleanup;
    });

    source.subscribe();

    observer.error(new Error('foo'));

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('calls the cleanup function on "complete"', () => {
    const cleanup = jest.fn();
    let observer!: SubscriptionObserver<any>;

    const source = new Observable(_observer => {
      observer = _observer;

      return cleanup;
    });

    source.subscribe();

    observer.complete();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('calls the cleanup function on "error" during create', () => {
    const cleanup = jest.fn();

    const source = new Observable(observer => {
      observer.error(new Error('foo'));

      return cleanup;
    });

    source.subscribe();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('calls the cleanup function on "complete" during create', () => {
    const cleanup = jest.fn();

    const source = new Observable(observer => {
      observer.complete();

      return cleanup;
    });

    source.subscribe();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test('handles multiple subscriptions and unsubscriptions', () => {
    let observers = 0;

    const source = new Observable(() => {
      observers++;

      return () => {
        observers--;
      };
    });

    const sub1 = source.subscribe();
    expect(observers).toBe(1);

    const sub2 = source.subscribe();
    expect(observers).toBe(2);

    sub1.unsubscribe();
    expect(observers).toBe(1);

    sub2.unsubscribe();
    expect(observers).toBe(0);
  });

  test('if a subscription is returned, then unsubscribe is called on cleanup', () => {
    let cleanup = false;
    const inner = new Observable(() => {
      return () => {
        cleanup = true;
      };
    });

    const source = new Observable(() => {
      return inner.subscribe();
    });

    source.subscribe().unsubscribe();

    expect(cleanup).toBe(true);
  });
});

describe('Symbol.observable', () => {
  test('Observable.prototype has a Symbol.observable method', () => {
    const observablePrototype = Observable.prototype as any;
    expect(typeof observablePrototype[symbolObservable]).toBe('function');
  });

  test('returns a reference to the observable itself', () => {
    const observable = new Observable(noop) as any;
    expect(observable).toBe(observable[symbolObservable]());
  });
});

describe('observable#pipe', () => {
  const plus1: MonoTypeOperatorFunction<number> = source =>
    new Observable(observer => {
      source.subscribe({
        next(val) {
          observer.next(val + 1);
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
    });

  const toString: OperatorFunction<number, string> = source =>
    new Observable(observer => {
      source.subscribe({
        next(val) {
          observer.next(val.toString());
        },
        error(err) {
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
    });

  test('should pipe multiple operations', () => {
    const numbers$ = $of(1, 2, 3);
    const actual: any[] = [];

    numbers$.pipe(plus1, toString).subscribe({
      next(x) {
        actual.push(x);
      },
    });

    expect(actual).toEqual(['2', '3', '4']);
  });

  test('should return the same observable if there are no arguments', () => {
    const numbers$ = $of(1, 2, 3);
    expect(numbers$.pipe()).toBe(numbers$);
  });
});

describe('observable#toPromise', () => {
  // Promises are always async, so we add a simple helper that we can `await` to
  // make sure they have completed.
  const tick = () => Promise.resolve();

  test('returns the last value', async () => {
    let observer!: SubscriptionObserver<any>;
    const source = new Observable(_observer => {
      observer = _observer;
    });

    const resolved = jest.fn();
    const rejected = jest.fn();

    source.toPromise().then(resolved, rejected);

    observer.next('foo');
    await tick();

    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();

    observer.next('bar');
    await tick();

    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).not.toHaveBeenCalled();

    observer.complete();
    await tick();

    expect(resolved).toHaveBeenCalledTimes(1);
    expect(resolved).toHaveBeenCalledWith('bar');
    expect(rejected).not.toHaveBeenCalled();
  });

  test('resolves even if no values received', async () => {
    let observer!: SubscriptionObserver<any>;
    const source = new Observable(_observer => {
      observer = _observer;
    });

    const resolved = jest.fn();
    const rejected = jest.fn();

    source.toPromise().then(resolved, rejected);

    observer.complete();
    await tick();

    expect(rejected).not.toHaveBeenCalled();
    expect(resolved).toHaveBeenCalledTimes(1);
  });

  test('rejects if error received', async () => {
    let observer!: SubscriptionObserver<any>;
    const source = new Observable(_observer => {
      observer = _observer;
    });

    const resolved = jest.fn();
    const rejected = jest.fn();

    source.toPromise().then(resolved, rejected);

    observer.error(new Error('fail'));
    await tick();

    expect(resolved).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledTimes(1);
    expect(rejected.mock.calls).toMatchSnapshot();
  });
});
