import { take } from './take';
import { Subject } from '../subjects';
import { collect, createCollectObserver } from '../lib/collect';
import { $fromIterable } from '../factories';

test('returns the first value, then completes', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(take(1));
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');

  expect(await res).toEqual(['foo', 'C']);
});

test('forwards errors', async () => {
  const error = new Error('bar');
  const values$ = new Subject();

  const observable = values$.pipe(take(2));
  const res = collect(observable);

  values$.next('foo');
  values$.error(error);

  expect(await res).toEqual(['foo', error]);
});

test('does not forward error if already received all expected items', async () => {
  const error = new Error('bar');
  const values$ = new Subject();

  const observable = values$.pipe(take(1));
  const res = collect(observable);

  values$.next('foo');
  values$.error(error);

  expect(await res).toEqual(['foo', 'C']);
});

test('handles source completing after receiving expected number of values', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(take(1));
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');
  values$.complete();

  expect(await res).toEqual(['foo', 'C']);
});

test('does not error if completing without receiving all expected values', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(take(2));
  const res = collect(observable);

  values$.next('foo');
  values$.complete();

  expect(await res).toEqual(['foo', 'C']);
});

test('support infinitely iterable values', async () => {
  function* counter() {
    let i = 0;
    while (true) {
      yield i++;
    }
  }

  const infiniteCounter = counter();
  const results: any[] = [];

  $fromIterable(infiniteCounter)
    .pipe(take(4))
    .subscribe(createCollectObserver(results));

  expect(results).toEqual([0, 1, 2, 3, 'C']);
});
