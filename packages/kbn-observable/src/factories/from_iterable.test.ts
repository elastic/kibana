import { $fromIterable } from './from_iterable';

test('handles array', () => {
  const values: number[] = [];
  const complete = jest.fn();

  $fromIterable([1, 2, 3]).subscribe({
    next(x) {
      values.push(x);
    },
    complete,
  });

  expect(values).toEqual([1, 2, 3]);
  expect(complete).toHaveBeenCalledTimes(1);
});

test('handles iterable', () => {
  const fooIterable: Iterable<number> = {
    [Symbol.iterator]: function*() {
      yield 1;
      yield 2;
      yield 3;
    },
  };

  const values: number[] = [];
  const error = jest.fn();
  const complete = jest.fn();

  $fromIterable(fooIterable).subscribe({
    next(x) {
      values.push(x);
    },
    complete,
  });

  expect(values).toEqual([1, 2, 3]);
  expect(error).not.toHaveBeenCalled();
  expect(complete).toHaveBeenCalledTimes(1);
});

test('emits error if iterator throws', () => {
  const err = new Error('foo');

  const fooIterable: Iterable<number> = {
    [Symbol.iterator]: function*() {
      yield 1;
      throw err;
    },
  };

  const values: number[] = [];
  const error = jest.fn();
  const complete = jest.fn();

  $fromIterable(fooIterable).subscribe({
    next(x) {
      values.push(x);
    },
    error,
    complete,
  });

  expect(values).toEqual([1]);
  expect(error).toHaveBeenCalledTimes(1);
  expect(error).toHaveBeenLastCalledWith(err);
  expect(complete).not.toHaveBeenCalled();
});

test('throws for "null"', () => {
  expect(() => {
    $fromIterable(null as any);
  }).toThrowErrorMatchingSnapshot();
});

test('throws for "undefined"', () => {
  expect(() => {
    $fromIterable(undefined as any);
  }).toThrowErrorMatchingSnapshot();
});

test('throws if no argument specified', () => {
  expect(() => {
    ($fromIterable as any)();
  }).toThrow(TypeError);
});
