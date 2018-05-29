import { schema } from '../..';

test('returns value by default', () => {
  expect(schema.boolean().validate(true)).toBe(true);
});

test('is required by default', () => {
  expect(() =>
    schema.boolean().validate(undefined)
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    schema.boolean().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(schema.boolean({ defaultValue: true }).validate(undefined)).toBe(
      true
    );
  });

  test('returns value when specified', () => {
    expect(schema.boolean({ defaultValue: true }).validate(false)).toBe(false);
  });
});

test('returns error when not boolean', () => {
  expect(() => schema.boolean().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() =>
    schema.boolean().validate([1, 2, 3])
  ).toThrowErrorMatchingSnapshot();

  expect(() => schema.boolean().validate('abc')).toThrowErrorMatchingSnapshot();
});
