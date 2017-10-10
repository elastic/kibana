import { number } from '../';

test('returns value by default', () => {
  expect(number().validate(4)).toBe(4);
});

test('handles numeric strings with ints', () => {
  expect(number().validate('4')).toBe(4);
});

test('handles numeric strings with floats', () => {
  expect(number().validate('4.23')).toBe(4.23);
});

test('fails if number is `NaN`', () => {
  expect(() => number().validate(NaN)).toThrowErrorMatchingSnapshot();
});

test('is required by default', () => {
  expect(() => number().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    number().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#min', () => {
  test('returns value when larger number', () => {
    expect(number({ min: 2 }).validate(3)).toBe(3);
  });

  test('returns error when smaller number', () => {
    expect(() => number({ min: 4 }).validate(3)).toThrowErrorMatchingSnapshot();
  });
});

describe('#max', () => {
  test('returns value when smaller number', () => {
    expect(number({ max: 4 }).validate(3)).toBe(3);
  });

  test('returns error when larger number', () => {
    expect(() => number({ max: 2 }).validate(3)).toThrowErrorMatchingSnapshot();
  });
});

describe('#defaultValue', () => {
  test('returns default when number is undefined', () => {
    expect(number({ defaultValue: 2 }).validate(undefined)).toBe(2);
  });

  test('returns value when specified', () => {
    expect(number({ defaultValue: 2 }).validate(3)).toBe(3);
  });
});

test('returns error when not number or numeric string', () => {
  expect(() => number().validate('test')).toThrowErrorMatchingSnapshot();

  expect(() => number().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => number().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
