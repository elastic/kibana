import { duration as momentDuration } from 'moment';

import { duration } from '../';

test('returns value by default', () => {
  expect(duration().validate('123s')).toMatchSnapshot();
});

test('is required by default', () => {
  expect(() => duration().validate(undefined)).toThrowErrorMatchingSnapshot();
});

test('includes context in failure', () => {
  expect(() =>
    duration().validate(undefined, 'foo-context')
  ).toThrowErrorMatchingSnapshot();
});

describe('#defaultValue', () => {
  test('can be a moment.Duration', () => {
    expect(
      duration({
        defaultValue: momentDuration(1, 'hour')
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a string', () => {
    expect(
      duration({
        defaultValue: '1h'
      }).validate(undefined)
    ).toMatchSnapshot();
  });

  test('can be a number', () => {
    expect(
      duration({
        defaultValue: 600
      }).validate(undefined)
    ).toMatchSnapshot();
  });
});

test('returns error when not string or non-safe positive integer', () => {
  expect(() => duration().validate(-123)).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(NaN)).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(Infinity)).toThrowErrorMatchingSnapshot();

  expect(() =>
    duration().validate(Math.pow(2, 53))
  ).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate([1, 2, 3])).toThrowErrorMatchingSnapshot();

  expect(() => duration().validate(/abc/)).toThrowErrorMatchingSnapshot();
});
