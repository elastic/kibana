import { schema } from '../..';

test('returns value by default', () => {
  expect(schema.number().validate(4)).toBe(4);
});

test('handles numeric strings with ints', () => {
  expect(schema.number().validate('4')).toBe(4);
});

test('handles numeric strings with floats', () => {
  expect(schema.number().validate('4.23')).toBe(4.23);
});

test('fails if number is `NaN`', () => {
  expect(() => schema.number().validate(NaN)).toThrowErrorMatchingSnapshot();
});

test('is required by default', () => {
  expect(() =>
    schema.number().validate(undefined)
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    schema.number().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#min', () => {
  test('returns value when larger number', () => {
    expect(schema.number({ min: 2 }).validate(3)).toBe(3);
  });

  test('returns error when smaller number', () => {
    expect(() =>
      schema.number({ min: 4 }).validate(3)
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#max', () => {
  test('returns value when smaller number', () => {
    expect(schema.number({ max: 4 }).validate(3)).toBe(3);
  });

  test('returns error when larger number', () => {
    expect(() =>
      schema.number({ max: 2 }).validate(3)
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#defaultValue', () => {
  test('returns default when number is undefined', () => {
    expect(schema.number({ defaultValue: 2 }).validate(undefined)).toBe(2);
  });

  test('returns value when specified', () => {
    expect(schema.number({ defaultValue: 2 }).validate(3)).toBe(3);
  });
});

test('returns error when not number or numeric string', () => {
  expect(() => schema.number().validate('test')).toThrowErrorMatchingSnapshot();

  expect(() =>
    schema.number().validate([1, 2, 3])
  ).toThrowErrorMatchingSnapshot();

  expect(() => schema.number().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
