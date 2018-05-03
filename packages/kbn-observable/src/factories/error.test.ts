import { $error } from './error';

test('immediately errors', () => {
  const err = new Error('foo');

  const next = jest.fn();
  const error = jest.fn();
  const complete = jest.fn();

  $error(err).subscribe({ next, error, complete });

  expect(next).not.toHaveBeenCalled();
  expect(error).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenLastCalledWith(err);
  expect(complete).not.toHaveBeenCalled();
});
