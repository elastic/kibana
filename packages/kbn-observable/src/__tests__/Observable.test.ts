import { Observable, SubscriptionObserver } from '../Observable';

test('receives values when subscribed', async () => {
  let observer: SubscriptionObserver<any>;

  const source = new Observable(_observer => {
    observer = _observer;
  });

  let res: any[] = [];

  source.subscribe({
    next(x) {
      res.push(x);
    }
  });

  observer!.next('foo');
  expect(res).toEqual(['foo']);

  observer!.next('bar');
  expect(res).toEqual(['foo', 'bar']);
});

test('triggers complete when observer is completed', async () => {
  let observer: SubscriptionObserver<any>;

  const source = new Observable(_observer => {
    observer = _observer;
  });

  const complete = jest.fn();

  source.subscribe({
    complete
  });

  observer!.complete();

  expect(complete).toHaveBeenCalledTimes(1);
});

test('should send errors thrown in the constructor down the error path', async () => {
  const err = new Error('this should be handled');

  const source = new Observable(observer => {
    throw err;
  });

  const error = jest.fn();

  source.subscribe({
    error
  });

  expect(error).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenCalledWith(err);
});

describe('subscriptions', () => {
  test('handles multiple subscriptions and unsubscriptions', () => {
    let observers = 0;

    const source = new Observable(observer => {
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
});

describe('Observable.from', () => {
  test('handles array', () => {
    const res: number[] = [];
    const complete = jest.fn();

    Observable.from([1, 2, 3]).subscribe({
      next(x) {
        res.push(x);
      },
      complete
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });

  test('handles iterable', () => {
    const fooIterable: Iterable<number> = {
      [Symbol.iterator]: function*() {
        yield 1;
        yield 2;
        yield 3;
      }
    };

    const res: number[] = [];
    const complete = jest.fn();

    Observable.from(fooIterable).subscribe({
      next(x) {
        res.push(x);
      },
      complete
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });
});

describe('Observable.of', () => {
  test('handles multiple args', () => {
    const res: number[] = [];
    const complete = jest.fn();

    Observable.of(1, 2, 3).subscribe({
      next(x) {
        res.push(x);
      },
      complete
    });

    expect(complete).toHaveBeenCalledTimes(1);
    expect(res).toEqual([1, 2, 3]);
  });
});
