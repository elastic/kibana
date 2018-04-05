import { $fromPromise } from './from_promise';
import { collect } from '../lib/collect';

test('should emit one value from a resolved promise', async () => {
  const promise = Promise.resolve(42);
  const values = collect($fromPromise(promise));

  expect(await values).toEqual([42, 'C']);
});

test('should raise error from a rejected promise', async () => {
  const error = new Error('foo');
  const promise = Promise.reject(error);
  const values = collect($fromPromise(promise));

  expect(await values).toEqual([error]);
});

test('should share the underlying promise with multiple subscribers', async () => {
  const promise = Promise.resolve(42);
  const observable = $fromPromise(promise);

  const values = await collect(observable);
  const values2 = await collect(observable);

  expect(values).toEqual([42, 'C']);
  expect(values2).toEqual([42, 'C']);
});

test('should accept already-resolved Promise', async () => {
  const promise = Promise.resolve(42);

  await promise;

  const values = collect($fromPromise(promise));

  expect(await values).toEqual([42, 'C']);
});

test('should accept PromiseLike object for interoperability', async () => {
  class CustomPromise<T> implements PromiseLike<T> {
    constructor(private promise: PromiseLike<T>) {}

    // These types are copied directly from `PromiseLike#then`
    then<TResult1 = T, TResult2 = never>(
      onFulfilled?:
        | ((value: T) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onRejected?:
        | ((reason: any) => TResult2 | PromiseLike<TResult2>)
        | undefined
        | null
    ): PromiseLike<TResult1 | TResult2> {
      return new CustomPromise(this.promise.then(onFulfilled, onRejected));
    }
  }

  const promise = new CustomPromise(Promise.resolve(42));
  const values = collect($fromPromise(promise));

  expect(await values).toEqual([42, 'C']);
});
