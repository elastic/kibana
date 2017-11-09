import { $from } from '../../factories';

test('handles array', () => {
  const res: number[] = [];
  const complete = jest.fn();

  $from([1, 2, 3]).subscribe({
    next(x) {
      res.push(x);
    },
    complete
  });

  expect(complete).toHaveBeenCalledTimes(1);
  expect(res).toEqual([1, 2, 3]);
});

test('handles iterable', () => {
  const fooIterable: Iterable<number> = {
    [Symbol.iterator]: function*() {
      yield 1;
      yield 2;
      yield 3;
    }
  };

  const res: number[] = [];
  const complete = jest.fn();

  $from(fooIterable).subscribe({
    next(x) {
      res.push(x);
    },
    complete
  });

  expect(complete).toHaveBeenCalledTimes(1);
  expect(res).toEqual([1, 2, 3]);
});
