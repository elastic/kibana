import { k$ } from '../../k$';
import { first } from '../';
import { Subject } from '../../Subject';
import { collect } from '../../lib/collect';

test('returns the first value, then completes', async () => {
  const values$ = new Subject();

  const observable = k$(values$)(first());
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');

  expect(await res).toEqual(['foo', 'C']);
});

test('handles source completing after receiving value', async () => {
  const values$ = new Subject();

  const observable = k$(values$)(first());
  const res = collect(observable);

  values$.next('foo');
  values$.next('bar');
  values$.complete();

  expect(await res).toEqual(['foo', 'C']);
});

test('returns error if completing without receiving any value', async () => {
  const values$ = new Subject();

  const observable = k$(values$)(first());
  const res = collect(observable);

  values$.complete();

  expect(await res).toMatchSnapshot();
});
