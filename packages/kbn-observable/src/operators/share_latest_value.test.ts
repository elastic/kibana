import { shareLatestValue } from './share_latest_value';
import { Observable, SubscriptionObserver } from '../observable';
import { SubjectWithCurrentValue } from '../subjects';
import { $fromIterable } from '../factories';
import { collect, createCollectObserver } from '../lib/collect';

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
  const subject = new Observable(observer => {
    observer.complete();
  });

  const results: any[] = [];
  const source = subject.pipe(shareLatestValue());

  source.subscribe(createCollectObserver(results));

  expect(results).toEqual(['C']);
});

test('should multicast a throw source', () => {
  const error = new Error('foo');
  const subject = new Observable(observer => {
    observer.error(error);
  });

  const results: any[] = [];
  const source = subject.pipe(shareLatestValue());

  source.subscribe(createCollectObserver(results));

  expect(results).toEqual([error]);
});

test('should multicast an error from the source to multiple observers', () => {
  let observer: SubscriptionObserver<string>;

  let subscriptions = 0;
  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
  });

  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  const source = observable.pipe(shareLatestValue());

  source.subscribe(createCollectObserver(results1));
  source.subscribe(createCollectObserver(results2));
  source.subscribe(createCollectObserver(results3));

  const error = new Error('fail');
  observer!.error(error);

  expect(subscriptions).toBe(1);
  expect(results1).toEqual([error]);
  expect(results2).toEqual([error]);
  expect(results3).toEqual([error]);
});

test('completes subsequent subscriptions immediately if source is completed', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<number>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next(1);
  });

  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  const source = observable.pipe(shareLatestValue());

  source.subscribe(createCollectObserver(results1));

  observer!.next(2);
  observer!.next(3);
  observer!.complete();

  source.subscribe(createCollectObserver(results2));
  source.subscribe(createCollectObserver(results3));

  expect(subscriptions).toBe(1);
  expect(results1).toEqual([1, 2, 3, 'C']);
  expect(results2).toEqual(['C']);
  expect(results3).toEqual(['C']);
});

test('should completely restart for subsequent subscriptions if source errors', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<number>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next(1);
  });

  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  const source = observable.pipe(shareLatestValue());

  source.subscribe(createCollectObserver(results1));

  observer!.next(2);
  observer!.next(3);

  const error = new Error('error1');
  observer!.error(error);

  source.subscribe(createCollectObserver(results2));
  source.subscribe(createCollectObserver(results3));

  observer!.next(4);

  const error2 = new Error('error2');
  observer!.error(error2);

  expect(subscriptions).toBe(2);
  expect(results1).toEqual([1, 2, 3, error]);
  expect(results2).toEqual([1, 4, error2]);
  expect(results3).toEqual([1, 4, error2]);
});

test('should _not_ restart if refCount hits 0 due to unsubscriptions', () => {
  let subscriptions = 0;
  let observer: SubscriptionObserver<number>;

  const observable = new Observable(_observer => {
    subscriptions++;
    observer = _observer;
    observer.next(1);
  });

  const results1: any[] = [];
  const results2: any[] = [];
  const results3: any[] = [];

  const source = observable.pipe(shareLatestValue());

  const sub1 = source.subscribe(createCollectObserver(results1));
  const sub2 = source.subscribe(createCollectObserver(results2));

  observer!.next(2);

  sub1.unsubscribe();
  sub2.unsubscribe();

  source.subscribe(createCollectObserver(results3));

  observer!.next(3);

  expect(subscriptions).toBe(1);
  expect(results1).toEqual([1, 2]);
  expect(results2).toEqual([1, 2]);
  expect(results3).toEqual([2, 3]);
});
