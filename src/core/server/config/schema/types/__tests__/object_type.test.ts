import { schema } from '../..';

test('returns value by default', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {
    name: 'test',
  };

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if missing required value', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {};

  expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});

test('returns value if undefined string with default', () => {
  const type = schema.object({
    name: schema.string({ defaultValue: 'test' }),
  });
  const value = {};

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if key does not exist in schema', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    bar: 'baz',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});

test('object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });
  const value = { foo: {} };

  expect(type.validate(value)).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('object within object with required', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string(),
    }),
  });
  const value = {};

  expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    let calledWith;

    const type = schema.object(
      {
        foo: schema.object({
          bar: schema.string({ defaultValue: 'baz' }),
        }),
      },
      {
        validate: value => {
          calledWith = value;
        },
      }
    );

    type.validate({ foo: {} });

    expect(calledWith).toEqual({
      foo: {
        bar: 'baz',
      },
    });
  });
});

test('called with wrong type', () => {
  const type = schema.object({});

  expect(() => type.validate('foo')).toThrowErrorMatchingSnapshot();
  expect(() => type.validate(123)).toThrowErrorMatchingSnapshot();
});

test('handles oneOf', () => {
  const type = schema.object({
    key: schema.oneOf([schema.string()]),
  });

  expect(type.validate({ key: 'foo' })).toEqual({ key: 'foo' });
  expect(() => type.validate({ key: 123 })).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong top-level type', () => {
  const type = schema.object({
    foo: schema.string(),
  });

  expect(() => type.validate([], 'foo-context')).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong value type', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    foo: 123,
  };

  expect(() =>
    type.validate(value, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});
