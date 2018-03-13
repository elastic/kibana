import { shareLatestValue } from './share_latest_value';
import { Observable, SubscriptionObserver } from '../observable';
import { SubjectWithCurrentValue } from '../subjects';
import { $fromIterable } from '../factories';
import { collect } from '../lib/collect';

test('should mirror a simple source Observable', async () => {
  const source = $fromIterable([4, 3, 2, 1]);

  const observable = source.pipe(shareLatestValue());
  const res = collect(observable);

  expect(await res).toEqual([4, 3, 2, 1, 'C']);
});

test('should do nothing if result is not subscribed', () => {
  let subscribed = false;
  const source = new Observable(() => {
    subscribed = true;
  });

  source.pipe(shareLatestValue());

  expect(subscribed).toBe(false);
});

test('should multicast the same values to multiple observers', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<string>;

  const subject = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
  });

  const results: any[] = [];
  const source = subject.pipe(shareLatestValue());

  source.subscribe(x => {
    results.push(`1/${x}`);
  });

  observer!.next('a');

  source.subscribe(x => {
    results.push(`2/${x}`);
  });

  source.subscribe(x => {
    results.push(`3/${x}`);
  });

  observer!.next('b');
  observer!.next('c');

  source.subscribe(x => {
    results.push(`4/${x}`);
  });

  expect(subscriptions).toBe(1);
  expect(results).toEqual([
    '1/a',
    '2/a',
    '3/a',
    '1/b',
    '2/b',
    '3/b',
    '1/c',
    '2/c',
    '3/c',
    '4/c',
  ]);
});

test('should multicast an empty source', () => {
  const subject = new Observable(_observer => {
    _observer.complete();
  });

  const results: any[] = [];
  const source = subject.pipe(shareLatestValue());

  source.subscribe({
    next(x) {
      results.push(`1/${x}`);
    },
    complete() {
      results.push(`1 complete`);
    },
  });

  expect(results).toEqual(['1 complete']);
});

test('should multicast a throw source', () => {
  const error = new Error('foo');
  const subject = new Observable(_observer => {
    _observer.error(error);
  });

  const results: any[] = [];
  const source = subject.pipe(shareLatestValue());

  source.subscribe({
    next(x) {
      results.push(`1/${x}`);
    },
    error(e) {
      results.push(e);
    },
    complete() {
      results.push(`1 complete`);
    },
  });

  expect(results).toEqual([error]);
});

test('should multicast an error from the source to multiple observers', () => {
  expect.assertions(1);

  const subject = new SubjectWithCurrentValue('a');
  const results: any[] = [];

  const source = subject.pipe(shareLatestValue());

  source.subscribe({
    error(err) {
      results.push([1, err]);
    },
  });

  source.subscribe({
    error(err) {
      results.push([2, err]);
    },
  });

  source.subscribe({
    error(err) {
      results.push([3, err]);
    },
  });

  const error = new Error('fail');
  subject.error(error);

  expect(results).toEqual([[1, error], [2, error], [3, error]]);
});

test('should replay results to subsequent subscriptions if source completes', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<string>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next('a');
  });

  const results: any[] = [];

  const source = observable.pipe(shareLatestValue());

  source.subscribe(x => {
    results.push(`1/${x}`);
  });

  observer!.next('b');
  observer!.next('c');
  observer!.complete();

  source.subscribe(x => {
    results.push(`2/${x}`);
  });

  source.subscribe(x => {
    results.push(`3/${x}`);
  });

  expect(subscriptions).toBe(1);
  expect(results).toEqual(['1/a', '1/b', '1/c', '2/c', '3/c']);
});

test('should completely restart for subsequent subscriptions if source errors', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<string>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next('a');
  });

  const results: any[] = [];

  const source = observable.pipe(shareLatestValue());

  source.subscribe(x => {
    results.push(`1/${x}`);
  });

  observer!.next('b');
  observer!.next('c');
  observer!.error(new Error('fail'));

  source.subscribe(x => {
    results.push(`2/${x}`);
  });

  source.subscribe(x => {
    results.push(`3/${x}`);
  });

  expect(subscriptions).toBe(2);
  expect(results).toEqual(['1/a', '1/b', '1/c', '2/a', '3/a']);
});

test('should _not_ restart if refCount hits 0 due to unsubscriptions', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<string>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next('a');
  });

  const results: any[] = [];

  const source = observable.pipe(shareLatestValue());

  const sub1 = source.subscribe(x => {
    results.push(`1/${x}`);
  });

  const sub2 = source.subscribe(x => {
    results.push(`2/${x}`);
  });

  observer!.next('b');

  sub1.unsubscribe();
  sub2.unsubscribe();

  source.subscribe(x => {
    results.push(`3/${x}`);
  });

  expect(subscriptions).toBe(1);
  expect(results).toEqual(['1/a', '2/a', '1/b', '2/b', '3/b']);
});
