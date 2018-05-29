import { schema } from '../..';

const { arrayOf, string, object, maybe } = schema;

test('returns value if it matches the type', () => {
  const type = arrayOf(string());
  expect(type.validate(['foo', 'bar', 'baz'])).toEqual(['foo', 'bar', 'baz']);
});

test('fails if wrong input type', () => {
  const type = arrayOf(string());
  expect(() => type.validate('test')).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong top-level type', () => {
  const type = arrayOf(string());
  expect(() =>
    type.validate('test', 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong item type', () => {
  const type = arrayOf(string());
  expect(() =>
    type.validate([123], 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('fails if wrong type of content in array', () => {
  const type = arrayOf(string());
  expect(() => type.validate([1, 2, 3])).toThrowErrorMatchingSnapshot();
});

test('fails if mixed types of content in array', () => {
  const type = arrayOf(string());
  expect(() =>
    type.validate(['foo', 'bar', true, {}])
  ).toThrowErrorMatchingSnapshot();
});

test('returns empty array if input is empty but type has default value', () => {
  const type = arrayOf(string({ defaultValue: 'test' }));
  expect(type.validate([])).toEqual([]);
});

test('returns empty array if input is empty even if type is required', () => {
  const type = arrayOf(string());
  expect(type.validate([])).toEqual([]);
});

test('fails for null values if optional', () => {
  const type = arrayOf(maybe(string()));
  expect(() => type.validate([null])).toThrowErrorMatchingSnapshot();
});

test('handles default values for undefined values', () => {
  const type = arrayOf(string({ defaultValue: 'foo' }));
  expect(type.validate([undefined])).toEqual(['foo']);
});

test('array within array', () => {
  const type = arrayOf(
    arrayOf(string(), {
      maxSize: 2,
      minSize: 2,
    }),
    { minSize: 1, maxSize: 1 }
  );

  const value = [['foo', 'bar']];

  expect(type.validate(value)).toEqual([['foo', 'bar']]);
});

test('object within array', () => {
  const type = arrayOf(
    object({
      foo: string({ defaultValue: 'foo' }),
    })
  );

  const value = [
    {
      foo: 'test',
    },
  ];

  expect(type.validate(value)).toEqual([{ foo: 'test' }]);
});

test('object within array with required', () => {
  const type = arrayOf(
    object({
      foo: string(),
    })
  );

  const value = [{}];

  expect(() => type.validate(value)).toThrowErrorMatchingSnapshot();
});

describe('#minSize', () => {
  test('returns value when more items', () => {
    expect(arrayOf(string(), { minSize: 1 }).validate(['foo'])).toEqual([
      'foo',
    ]);
  });

  test('returns error when fewer items', () => {
    expect(() =>
      arrayOf(string(), { minSize: 2 }).validate(['foo'])
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#maxSize', () => {
  test('returns value when fewer items', () => {
    expect(arrayOf(string(), { maxSize: 2 }).validate(['foo'])).toEqual([
      'foo',
    ]);
  });

  test('returns error when more items', () => {
    expect(() =>
      arrayOf(string(), { maxSize: 1 }).validate(['foo', 'bar'])
    ).toThrowErrorMatchingSnapshot();
  });
});
