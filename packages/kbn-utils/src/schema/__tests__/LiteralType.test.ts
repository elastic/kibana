import { literal } from '../';

test('handles string', () => {
  expect(literal('test').validate('test')).toBe('test');
});

test('handles boolean', () => {
  expect(literal(false).validate(false)).toBe(false);
});

test('handles number', () => {
  expect(literal(123).validate(123)).toBe(123);
});

test('returns error when not correct', () => {
  expect(() => literal('test').validate('foo')).toThrowErrorMatchingSnapshot();

  expect(() => literal(true).validate(false)).toThrowErrorMatchingSnapshot();

  expect(() =>
    literal('test').validate([1, 2, 3])
  ).toThrowErrorMatchingSnapshot();

  expect(() => literal(123).validate('abc')).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    literal('test').validate('foo', 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});
