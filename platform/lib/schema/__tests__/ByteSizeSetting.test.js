import { byteSize } from '../';
import { ByteSizeValue } from '../../../lib/ByteSizeValue';

test('returns value by default', () => {
  expect(byteSize().validate('123b')).toMatchSnapshot();
});

test('is required by default', () => {
  expect(() => byteSize().validate(undefined)).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('can be a ByteSizeValue', () => {
    expect(
      byteSize({
        defaultValue: ByteSizeValue.parse('1kb')
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a string', () => {
    expect(
      byteSize({
        defaultValue: '1kb'
      }).validate(undefined)
    ).toMatchSnapshot();
  });
});

describe('#min', () => {
  test('returns value when larger', () => {
    expect(
      byteSize({
        min: '1b'
      }).validate('1kb')
    ).toMatchSnapshot();
  });

  test('returns error when smaller', () => {
    expect(() =>
      byteSize().min('1kb').validate('1b')).toThrowErrorMatchingSnapshot();
  });
});

describe('#max', () => {
  test('returns value when smaller', () => {
    expect(byteSize({ max: '1kb' }).validate('1b')).toMatchSnapshot();
  });

  test('returns error when larger', () => {
    expect(() =>
      byteSize({ max: '1kb' }).validate('1mb')).toThrowErrorMatchingSnapshot();
  });
});

test('returns error when not string', () => {
  expect(() => byteSize().validate(123)).toThrowErrorMatchingSnapshot();

  expect(() => byteSize().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => byteSize().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
