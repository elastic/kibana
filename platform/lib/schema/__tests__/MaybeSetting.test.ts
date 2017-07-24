import { maybe, string } from '../';

test('returns value if specified', () => {
  const setting = maybe(string());
  expect(setting.validate('test')).toEqual('test');
});

test('returns undefined if undefined', () => {
  const setting = maybe(string());
  expect(setting.validate(undefined)).toEqual(undefined);
});

test('returns undefined even if contained setting has a default value', () => {
  const setting = maybe(
    string({
      defaultValue: 'abc'
    })
  );

  expect(setting.validate(undefined)).toEqual(undefined);
});

test('calls validate on contained setting', () => {
  const spy = jest.fn();

  const setting = maybe(
    string({
      validate: spy
    })
  );

  setting.validate('foo');

  expect(spy).toHaveBeenCalledWith('foo');
});

test('fails if null', () => {
  const setting = maybe(string());
  expect(() => setting.validate(null)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  const setting = maybe(string());
  expect(() =>
    setting.validate(null, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});
