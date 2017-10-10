import { arrayOf, string, object, maybe } from '../';

test('returns value if it matches the type', () => {
  const setting = arrayOf(string());
  expect(setting.validate(['foo', 'bar', 'baz'])).toEqual([
    'foo',
    'bar',
    'baz'
  ]);
});

test('fails if wrong input type', () => {
  const setting = arrayOf(string());
  expect(() => setting.validate('test')).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong top-level type', () => {
  const setting = arrayOf(string());
  expect(() =>
    setting.validate('test', 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong item type', () => {
  const setting = arrayOf(string());
  expect(() =>
    setting.validate([123], 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('fails if wrong type of content in array', () => {
  const setting = arrayOf(string());
  expect(() => setting.validate([1, 2, 3])).toThrowErrorMatchingSnapshot();
});

test('fails if mixed types of content in array', () => {
  const setting = arrayOf(string());
  expect(() =>
    setting.validate(['foo', 'bar', true, {}])
  ).toThrowErrorMatchingSnapshot();
});

test('returns empty array if input is empty but setting has default value', () => {
  const setting = arrayOf(string({ defaultValue: 'test' }));
  expect(setting.validate([])).toEqual([]);
});

test('returns empty array if input is empty even if setting is required', () => {
  const setting = arrayOf(string());
  expect(setting.validate([])).toEqual([]);
});

test('fails for null values if optional', () => {
  const setting = arrayOf(maybe(string()));
  expect(() => setting.validate([null])).toThrowErrorMatchingSnapshot();
});

test('handles default values for undefined values', () => {
  const setting = arrayOf(string({ defaultValue: 'foo' }));
  expect(setting.validate([undefined])).toEqual(['foo']);
});

test('array within array', () => {
  const setting = arrayOf(
    arrayOf(string(), {
      minSize: 2,
      maxSize: 2
    }),
    { minSize: 1, maxSize: 1 }
  );

  const value = [['foo', 'bar']];

  expect(setting.validate(value)).toEqual([['foo', 'bar']]);
});

test('object within array', () => {
  const setting = arrayOf(
    object({
      foo: string({ defaultValue: 'foo' })
    })
  );

  const value = [
    {
      foo: 'test'
    }
  ];

  expect(setting.validate(value)).toEqual([{ foo: 'test' }]);
});

test('object within array with required', () => {
  const setting = arrayOf(
    object({
      foo: string()
    })
  );

  const value = [{}];

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

describe('#minSize', () => {
  test('returns value when more items', () => {
    expect(arrayOf(string(), { minSize: 1 }).validate(['foo'])).toEqual([
      'foo'
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
      'foo'
    ]);
  });

  test('returns error when more items', () => {
    expect(() =>
      arrayOf(string(), { maxSize: 1 }).validate(['foo', 'bar'])
    ).toThrowErrorMatchingSnapshot();
  });
});
