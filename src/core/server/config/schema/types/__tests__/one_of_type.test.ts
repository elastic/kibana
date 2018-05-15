import { schema } from '../..';

const { oneOf, string, number, literal, object, maybe } = schema;

test('handles string', () => {
  expect(oneOf([string()]).validate('test')).toBe('test');
});

test('handles string with default', () => {
  const type = oneOf([string()], {
    defaultValue: 'test',
  });

  expect(type.validate(undefined)).toBe('test');
});

test('handles number', () => {
  expect(oneOf([number()]).validate(123)).toBe(123);
});

test('handles number with default', () => {
  const type = oneOf([number()], {
    defaultValue: 123,
  });

  expect(type.validate(undefined)).toBe(123);
});

test('handles literal', () => {
  const type = oneOf([literal('foo')]);

  expect(type.validate('foo')).toBe('foo');
});

test('handles literal with default', () => {
  const type = oneOf([literal('foo')], {
    defaultValue: 'foo',
  });

  expect(type.validate(undefined)).toBe('foo');
});

test('handles multiple literals with default', () => {
  const type = oneOf([literal('foo'), literal('bar')], {
    defaultValue: 'bar',
  });

  expect(type.validate('foo')).toBe('foo');
  expect(type.validate(undefined)).toBe('bar');
});

test('handles object', () => {
  const type = oneOf([object({ name: string() })]);

  expect(type.validate({ name: 'foo' })).toEqual({ name: 'foo' });
});

test('handles object with wrong type', () => {
  const type = oneOf([object({ age: number() })]);

  expect(() => type.validate({ age: 'foo' })).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  const type = oneOf([object({ age: number() })]);

  expect(() =>
    type.validate({ age: 'foo' }, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('handles multiple objects with same key', () => {
  const type = oneOf([object({ age: string() }), object({ age: number() })]);

  expect(type.validate({ age: 'foo' })).toEqual({ age: 'foo' });
});

test('handles multiple types', () => {
  const type = oneOf([string(), number()]);

  expect(type.validate('test')).toBe('test');
  expect(type.validate(123)).toBe(123);
});

test('handles maybe', () => {
  const type = oneOf([maybe(string())]);

  expect(type.validate(undefined)).toBe(undefined);
  expect(type.validate('test')).toBe('test');
});

test('fails if not matching type', () => {
  const type = oneOf([string()]);

  expect(() => type.validate(false)).toThrowErrorMatchingSnapshot();
  expect(() => type.validate(123)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching multiple types', () => {
  const type = oneOf([string(), number()]);

  expect(() => type.validate(false)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching literal', () => {
  const type = oneOf([literal('foo')]);

  expect(() => type.validate('bar')).toThrowErrorMatchingSnapshot();
});
