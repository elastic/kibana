import { mapOf, object, string, number } from '../';

test('handles object as input', () => {
  const setting = mapOf(string(), string());
  const value = {
    name: 'foo'
  };
  const expected = new Map([['name', 'foo']]);

  expect(setting.validate(value)).toEqual(expected);
});

test('fails when not receiving expected value type', () => {
  const setting = mapOf(string(), string());
  const value = {
    name: 123
  };

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

test('fails when not receiving expected key type', () => {
  const setting = mapOf(number(), string());
  const value = {
    name: 'foo'
  };

  expect(() => setting.validate(value)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong top-level type', () => {
  const setting = mapOf(string(), string());
  expect(() =>
    setting.validate([], 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong value type', () => {
  const setting = mapOf(string(), string());
  const value = {
    name: 123
  };

  expect(() =>
    setting.validate(value, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('includes context in failure when wrong key type', () => {
  const setting = mapOf(number(), string());
  const value = {
    name: 'foo'
  };

  expect(() =>
    setting.validate(value, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

test('returns default value if undefined', () => {
  const obj = new Map([['foo', 'bar']]);

  const setting = mapOf(string(), string(), {
    defaultValue: obj
  });

  expect(setting.validate(undefined)).toEqual(obj);
});

test('mapOf within mapOf', () => {
  const setting = mapOf(string(), mapOf(string(), number()));
  const value = {
    foo: {
      bar: 123
    }
  };
  const expected = new Map([['foo', new Map([['bar', 123]])]]);

  expect(setting.validate(value)).toEqual(expected);
});

test('object within mapOf', () => {
  const setting = mapOf(
    string(),
    object({
      bar: number()
    })
  );
  const value = {
    foo: {
      bar: 123
    }
  };
  const expected = new Map([['foo', { bar: 123 }]]);

  expect(setting.validate(value)).toEqual(expected);
});
