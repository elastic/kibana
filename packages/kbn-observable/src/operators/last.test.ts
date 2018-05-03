import { last } from './last';
import { Subject } from '../subjects';
import { collect } from '../lib/collect';

test('returns the last value', async () => {
  const values$ = new Subject();

  const res = collect(values$.pipe(last()));

  values$.next('foo');
  values$.next('bar');
  values$.complete();

  expect(await res).toEqual(['bar', 'C']);
});

test('returns error if completing without receiving any value', async () => {
  const values$ = new Subject();

  const error = jest.fn();

  values$.pipe(last()).subscribe({
    error,
  });

  values$.complete();

  expect(error).toHaveBeenCalledTimes(1);
  expect(error.mock.calls).toMatchSnapshot();
});
