import { Observable, SubscriptionObserver } from '../../Observable';
import { BehaviorSubject } from '../../BehaviorSubject';
import { k$ } from '../../k$';
import { shareLast } from '../';
import { collect } from '../../lib/collect';

test('should mirror a simple source Observable', async () => {
  const source = Observable.from([4, 3, 2, 1]);

  const observable = k$(source)(shareLast());
  const res = collect(observable);

  expect(await res).toEqual([4, 3, 2, 1, 'C']);
});

test('should do nothing if result is not subscribed', () => {
  let subscribed = false;
  const source = new Observable(() => {
    subscribed = true;
  });

  k$(source)(shareLast());

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
  const source = k$(subject)(shareLast());

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
    '4/c'
  ]);
});

test('should multicast an error from the source to multiple observers', () => {
  expect.assertions(1);

  const subject = new BehaviorSubject('a');
  const results: any[] = [];

  const source = k$(subject)(shareLast());

  source.subscribe({
    error(err) {
      results.push([1, err]);
    }
  });

  source.subscribe({
    error(err) {
      results.push([2, err]);
    }
  });

  source.subscribe({
    error(err) {
      results.push([3, err]);
    }
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

  const source = k$(observable)(shareLast());

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

  const source = k$(observable)(shareLast());

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

test('restarts if refCount hits 0 due to unsubscriptions', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<string>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next('a');
  });

  const results: any[] = [];

  const source = k$(observable)(shareLast());

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

  expect(subscriptions).toBe(2);
  expect(results).toEqual(['1/a', '2/a', '1/b', '2/b', '3/a']);
});
