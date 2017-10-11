import { object, string, oneOf } from '../';

test('returns value by default', () => {
  const setting = object({
    name: string()
  });
  const value = {
    name: 'test'
  };

  expect(setting.validate(value)).toEqual({ name: 'test' });
});

test('fails if missing required value', () => {
  const setting = object({
    name: string()
  });
  const value = {};

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

test('returns value if undefined string with default', () => {
  const setting = object({
    name: string({ defaultValue: 'test' })
  });
  const value = {};

  expect(setting.validate(value)).toEqual({ name: 'test' });
});

test('fails if key does not exist in schema', () => {
  const setting = object({
    foo: string()
  });
  const value = {
    bar: 'baz'
  };

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

test('object within object', () => {
  const setting = object({
    foo: object({
      bar: string({ defaultValue: 'hello world' })
    })
  });
  const value = { foo: {} };

  expect(setting.validate(value)).toEqual({
    foo: {
      bar: 'hello world'
    }
  });
});

test('object within object with required', () => {
  const setting = object({
    foo: object({
      bar: string()
    })
  });
  const value = {};

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    let calledWith;

    const setting = object(
      {
        foo: object({
          bar: string({ defaultValue: 'baz' })
        })
      },
      {
        validate: value => {
          calledWith = value;
        }
      }
    );

    setting.validate({ foo: {} });

    expect(calledWith).toEqual({
      foo: {
        bar: 'baz'
      }
    });
  });
});

test('called with wrong type', () => {
  const setting = object({});

  expect(() => setting.validate('foo')).toThrowErrorMatchingSnapshot();
  expect(() => setting.validate(123)).toThrowErrorMatchingSnapshot();
});

test('handles oneOf', () => {
  const setting = object({
    key: oneOf([string()])
  });

  expect(setting.validate({ key: 'foo' })).toEqual({ key: 'foo' });
  expect(() => setting.validate({ key: 123 })).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong top-level type', () => {
  const setting = object({
    foo: string()
  });

  expect(() =>
    setting.validate([], 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong value type', () => {
  const setting = object({
    foo: string()
  });
  const value = {
    foo: 123
  };

  expect(() =>
    setting.validate(value, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});
