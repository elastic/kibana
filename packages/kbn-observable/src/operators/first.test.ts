import { first } from './first';
import { Subject } from '../subjects';
import { collect } from '../lib/collect';
import { $fromIterable } from '../factories';

test('returns the first value, then completes', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(first());
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');

  expect(await res).toEqual(['foo', 'C']);
});

test('handles source completing after receiving value', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(first());
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');
  values$.complete();

  expect(await res).toEqual(['foo', 'C']);
});

test('returns error if completing without receiving any value', async () => {
  const values$ = new Subject();

  const observable = values$.pipe(first());
  const res = collect(observable);

  values$.complete();

  expect(await res).toMatchSnapshot();
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

  const res = collect($fromIterable(infiniteCounter).pipe(first()));

  expect(await res).toEqual([0, 'C']);
});
