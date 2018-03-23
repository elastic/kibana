import { $of } from './of';

test('arguments are delivered to next, then observable is completed', () => {
  const values: number[] = [];
  const complete = jest.fn();

  $of(1, 2, 3).subscribe({
    next(x) {
      values.push(x);
    },
    complete,
  });

  expect(complete).toHaveBeenCalledTimes(1);
  expect(values).toEqual([1, 2, 3]);
});
