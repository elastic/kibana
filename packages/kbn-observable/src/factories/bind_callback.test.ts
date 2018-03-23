import { $of } from './of';
import { $bindCallback } from './bind_callback';
import { Subject } from '../subjects';
import { collect } from '../lib/collect';
import { switchMap } from '../operators/switch_map';
import { Observable } from '..';

test('should emit undefined from a callback without arguments', async () => {
  const boundCallback = $bindCallback(cb => cb());
  const res = collect(boundCallback());

  expect(await res).toEqual([undefined, 'C']);
});

test('should emit one value from a callback', async () => {
  const boundCallback = $bindCallback<string>(cb => cb('foo'));
  const res = collect(boundCallback());

  expect(await res).toEqual(['foo', 'C']);
});

test('callback receives input arguments to bound callback', async () => {
  const callback = (arg1: string, arg2: number, cb: Function) =>
    cb(`${arg1}/${arg2}`);

  const boundCallback = $bindCallback(callback);
  const res = collect(boundCallback('foo', 123));

  expect(await res).toEqual(['foo/123', 'C']);
});

test('should set callback function context to context of returned function', async () => {
  const boundCallback = $bindCallback<number>(function callback(this: any, cb) {
    cb(this.foo);
  });

  const res = collect(boundCallback.apply({ foo: 5 }));

  expect(await res).toEqual([5, 'C']);
});

test('should not emit, throw or complete if immediately unsubscribed', done => {
  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  let timeout: any;

  const boundCallback = $bindCallback<string>(cb => {
    // Need to cb async in order for the unsub to trigger
    timeout = setTimeout(() => {
      cb('should not be called');
    }, 10);
  });

  const subscription = boundCallback().subscribe({ next, error, complete });

  subscription.unsubscribe();

  setTimeout(() => {
    expect(next).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();

    clearTimeout(timeout);
    done();
  }, 20);
});

test('errors if callback is called with more than two args', async () => {
  const read = (cb: Function) => cb('arg1', 'arg2');

  const boundCallback = $bindCallback(read);
  const res = collect(boundCallback());

  expect(await res).toMatchSnapshot();
});

test('example with returning an observable', async () => {
  const boundCallback = $bindCallback<Observable<number>>(callback => {
    callback($of(1, 2, 3));
  });

  const observable = boundCallback().pipe(switchMap(obs => obs));

  const res = collect(observable);

  expect(await res).toEqual([1, 2, 3, 'C']);
});
