import { k$ } from '../../k$';
import { Subject } from '../../Subject';
import { last } from '../';

test('returns the last value', async () => {
  const values$ = new Subject();

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  k$(values$)(last()).subscribe(next, error, complete);

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

  k$(values$)(last()).subscribe({
    error
  });

  values$.complete();

  expect(error).toHaveBeenCalledTimes(1);
  expect(error.mock.calls).toMatchSnapshot();
});
