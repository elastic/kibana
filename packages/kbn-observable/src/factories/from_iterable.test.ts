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
  const complete = jest.fn();

  $fromIterable(fooIterable).subscribe({
    next(x) {
      values.push(x);
    },
    complete,
  });

  expect(values).toEqual([1, 2, 3]);
  expect(complete).toHaveBeenCalledTimes(1);
});

test('throws for "null"', () => {
  expect(() => {
    $fromIterable(null as any);
  }).toThrow(TypeError);
});

test('throws for "undefined"', () => {
  expect(() => {
    $fromIterable(undefined as any);
  }).toThrow(TypeError);
});

test('throws if no argument specified', () => {
  expect(() => {
    ($fromIterable as any)();
  }).toThrow(TypeError);
});
