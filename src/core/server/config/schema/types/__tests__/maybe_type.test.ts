import { schema } from '../..';

const { maybe, string } = schema;

test('returns value if specified', () => {
  const type = maybe(string());
  expect(type.validate('test')).toEqual('test');
});

test('returns undefined if undefined', () => {
  const type = maybe(string());
  expect(type.validate(undefined)).toEqual(undefined);
});

test('returns undefined even if contained type has a default value', () => {
  const type = maybe(
    string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toEqual(undefined);
});

test('calls validate on contained type', () => {
  const spy = jest.fn();

  const type = maybe(
    string({
      validate: spy,
    })
  );

  type.validate('foo');

  expect(spy).toHaveBeenCalledWith('foo');
});

test('fails if null', () => {
  const type = maybe(string());
  expect(() => type.validate(null)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  const type = maybe(string());
  expect(() =>
    type.validate(null, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});
