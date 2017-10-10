import { oneOf, string, number, literal, object, maybe } from '../';

test('handles string', () => {
  expect(oneOf([string()]).validate('test')).toBe('test');
});

test('handles string with default', () => {
  const setting = oneOf([string()], {
    defaultValue: 'test'
  });

  expect(setting.validate(undefined)).toBe('test');
});

test('handles number', () => {
  expect(oneOf([number()]).validate(123)).toBe(123);
});

test('handles number with default', () => {
  const setting = oneOf([number()], {
    defaultValue: 123
  });

  expect(setting.validate(undefined)).toBe(123);
});

test('handles literal', () => {
  const setting = oneOf([literal('foo')]);

  expect(setting.validate('foo')).toBe('foo');
});

test('handles literal with default', () => {
  const setting = oneOf([literal('foo')], {
    defaultValue: 'foo'
  });

  expect(setting.validate(undefined)).toBe('foo');
});

test('handles multiple literals with default', () => {
  const setting = oneOf([literal('foo'), literal('bar')], {
    defaultValue: 'bar'
  });

  expect(setting.validate('foo')).toBe('foo');
  expect(setting.validate(undefined)).toBe('bar');
});

test('handles object', () => {
  const setting = oneOf([object({ name: string() })]);

  expect(setting.validate({ name: 'foo' })).toEqual({ name: 'foo' });
});

test('handles object with wrong type', () => {
  const setting = oneOf([object({ age: number() })]);

  expect(() => setting.validate({ age: 'foo' })).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  const setting = oneOf([object({ age: number() })]);

  expect(() =>
    setting.validate({ age: 'foo' }, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('handles multiple objects with same key', () => {
  const setting = oneOf([object({ age: string() }), object({ age: number() })]);

  expect(setting.validate({ age: 'foo' })).toEqual({ age: 'foo' });
});

test('handles multiple types', () => {
  const setting = oneOf([string(), number()]);

  expect(setting.validate('test')).toBe('test');
  expect(setting.validate(123)).toBe(123);
});

test('handles maybe', () => {
  const setting = oneOf([maybe(string())]);

  expect(setting.validate(undefined)).toBe(undefined);
  expect(setting.validate('test')).toBe('test');
});

test('fails if not matching type', () => {
  const setting = oneOf([string()]);

  expect(() => setting.validate(false)).toThrowErrorMatchingSnapshot();
  expect(() => setting.validate(123)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching multiple types', () => {
  const setting = oneOf([string(), number()]);

  expect(() => setting.validate(false)).toThrowErrorMatchingSnapshot();
});

test('fails if not matching literal', () => {
  const setting = oneOf([literal('foo')]);

  expect(() => setting.validate('bar')).toThrowErrorMatchingSnapshot();
});
