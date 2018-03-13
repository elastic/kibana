import { last } from './last';
import { Subject } from '../subjects';

test('returns the last value', async () => {
  const values$ = new Subject();

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  values$.pipe(last()).subscribe({ next, error, complete });

  values$.next('foo');
  expect(next).not.toHaveBeenCalled();

  values$.next('bar');
  expect(next).not.toHaveBeenCalled();

  values$.complete();

  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith('bar');
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
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
