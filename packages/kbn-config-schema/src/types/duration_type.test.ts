/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { duration as momentDuration } from 'moment';
import { schema } from '..';

const { duration, object, contextRef, siblingRef } = schema;

test('returns value by default', () => {
  expect(duration().validate('123s')).toEqual(momentDuration(123000));
});

test('handles numeric string', () => {
  expect(duration().validate('123000')).toEqual(momentDuration(123000));
});

test('handles number', () => {
  expect(duration().validate(123000)).toEqual(momentDuration(123000));
});

test('is required by default', () => {
  expect(() => duration().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [moment.Duration] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    duration().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [moment.Duration] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('can be a moment.Duration', () => {
    expect(
      duration({
        defaultValue: momentDuration(1, 'hour'),
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);
  });

  test('can be a string', () => {
    expect(
      duration({
        defaultValue: '1h',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);
  });

  test('can be a string-formatted number', () => {
    expect(
      duration({
        defaultValue: '600',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT0.6S"`);
  });

  test('can be a number', () => {
    expect(
      duration({
        defaultValue: 600,
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT0.6S"`);
  });

  test('can be a function that returns compatible type', () => {
    expect(
      duration({
        defaultValue: () => 600,
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT0.6S"`);

    expect(
      duration({
        defaultValue: () => '1h',
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);

    expect(
      duration({
        defaultValue: () => momentDuration(1, 'hour'),
      }).validate(undefined)
    ).toMatchInlineSnapshot(`"PT1H"`);
  });

  test('can be a reference to a moment.Duration', () => {
    expect(
      object({
        source: duration({ defaultValue: 600 }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate({}, { val: momentDuration(700, 'ms') })
    ).toMatchInlineSnapshot(`
      Object {
        "fromContext": "PT0.7S",
        "source": "PT0.6S",
        "target": "PT0.6S",
      }
    `);

    expect(
      object({
        source: duration({ defaultValue: '1h' }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate({}, { val: momentDuration(2, 'hour') })
    ).toMatchInlineSnapshot(`
      Object {
        "fromContext": "PT2H",
        "source": "PT1H",
        "target": "PT1H",
      }
    `);

    expect(
      object({
        source: duration({ defaultValue: momentDuration(1, 'hour') }),
        target: duration({ defaultValue: siblingRef('source') }),
        fromContext: duration({ defaultValue: contextRef('val') }),
      }).validate({}, { val: momentDuration(2, 'hour') })
    ).toMatchInlineSnapshot(`
      Object {
        "fromContext": "PT2H",
        "source": "PT1H",
        "target": "PT1H",
      }
    `);
  });
});

test('returns error when not valid string or non-safe positive integer', () => {
  expect(() => duration().validate(-123)).toThrowErrorMatchingInlineSnapshot(
    `"Value in milliseconds is expected to be a safe positive integer."`
  );

  expect(() => duration().validate(NaN)).toThrowErrorMatchingInlineSnapshot(
    `"Value in milliseconds is expected to be a safe positive integer."`
  );

  expect(() => duration().validate(Infinity)).toThrowErrorMatchingInlineSnapshot(
    `"Value in milliseconds is expected to be a safe positive integer."`
  );

  expect(() => duration().validate(Math.pow(2, 53))).toThrowErrorMatchingInlineSnapshot(
    `"Value in milliseconds is expected to be a safe positive integer."`
  );

  expect(() => duration().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [moment.Duration] but got [Array]"`
  );

  expect(() => duration().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [moment.Duration] but got [RegExp]"`
  );

  expect(() => duration().validate('123foo')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format <count>[ms|s|m|h|d|w|M|Y] (e.g. '70ms', '5s', '3d', '1Y'), where the duration is a safe positive integer."`
  );

  expect(() => duration().validate('123 456')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format <count>[ms|s|m|h|d|w|M|Y] (e.g. '70ms', '5s', '3d', '1Y'), where the duration is a safe positive integer."`
  );
});
