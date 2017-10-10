import { boolean } from '../';

test('returns value by default', () => {
  expect(boolean().validate(true)).toBe(true);
});

test('is required by default', () => {
  expect(() => boolean().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    boolean().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(boolean({ defaultValue: true }).validate(undefined)).toBe(true);
  });

  test('returns value when specified', () => {
    expect(boolean({ defaultValue: true }).validate(false)).toBe(false);
  });
});

test('returns error when not boolean', () => {
  expect(() => boolean().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() => boolean().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => boolean().validate('abc')).toThrowErrorMatchingSnapshot();
});
