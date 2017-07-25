import { string } from '../';

test('returns value is string and defined', () => {
  expect(string().validate('test')).toBe('test');
});

test('is required by default', () => {
  expect(() => string().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    string().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#minLength', () => {
  test('returns value when longer string', () => {
    expect(string({ minLength: 2 }).validate('foo')).toBe('foo');
  });

  test('returns error when shorter string', () => {
    expect(() =>
      string({ minLength: 4 }).validate('foo')
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#maxLength', () => {
  test('returns value when shorter string', () => {
    expect(string({ maxLength: 4 }).validate('foo')).toBe('foo');
  });

  test('returns error when longer string', () => {
    expect(() =>
      string({ maxLength: 2 }).validate('foo')
    ).toThrowErrorMatchingSnapshot();
  });
});

describe('#defaultValue', () => {
  test('returns default when string is undefined', () => {
    expect(string({ defaultValue: 'foo' }).validate(undefined)).toBe('foo');
  });

  test('returns value when specified', () => {
    expect(string({ defaultValue: 'foo' }).validate('bar')).toBe('bar');
  });
});

describe('#validate', () => {
  test('is called with input value', () => {
    let calledWith;

    const validator = (val: any) => {
      calledWith = val;
    };

    string({ validate: validator }).validate('test');

    expect(calledWith).toBe('test');
  });

  test('is called with default value in no input', () => {
    let calledWith;

    const validate = (val: any) => {
      calledWith = val;
    };

    string({ validate, defaultValue: 'foo' }).validate(undefined);

    expect(calledWith).toBe('foo');
  });

  test('throws when returns string', () => {
    const validate = () => 'validator failure';

    expect(() =>
      string({ validate }).validate('foo')
    ).toThrowErrorMatchingSnapshot();
  });
});

test('returns error when not string', () => {
  expect(() => string().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() => string().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => string().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
