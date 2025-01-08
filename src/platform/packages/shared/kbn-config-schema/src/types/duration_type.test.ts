/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration as momentDuration } from 'moment';
import { schema } from '../..';
import { ensureDuration } from '../duration';

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

test('handles multi-unit', () => {
  expect(duration().validate('1m30s')).toEqual(momentDuration(90000));
  expect(duration().validate('1m30s70ms')).toEqual(momentDuration(90070));
});

test.each([60000, '60000', '60000ms', '60s', '1m', '1m0s'])(
  'multiple ways of introducing 1 minute: %p',
  (d) => {
    expect(duration().validate(d)).toEqual(momentDuration(60000));
  }
);

test('it supports years as Y and y', () => {
  expect(duration().validate('1y')).toEqual(duration().validate('1Y'));
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

describe('#min', () => {
  it('returns the value when larger', () => {
    expect(duration({ min: '5m' }).validate('7m')).toEqual(ensureDuration('7m'));
  });
  it('throws error when value is smaller', () => {
    expect(() => duration({ min: '5m' }).validate('3m')).toThrowErrorMatchingInlineSnapshot(
      `"Value must be equal to or greater than [PT5M]"`
    );
  });
});

describe('#max', () => {
  it('returns the value when smaller', () => {
    expect(duration({ max: '10d' }).validate('7d')).toEqual(ensureDuration('7d'));
  });
  it('throws error when value is greater', () => {
    expect(() => duration({ max: '10h' }).validate('17h')).toThrowErrorMatchingInlineSnapshot(
      `"Value must be equal to or less than [PT10H]"`
    );
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
    `"Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format <count>[ms|s|m|h|d|w|M|y] (e.g. '70ms', '5s', '3d', '1y', '1m30s'), where the duration is a safe positive integer."`
  );

  expect(() => duration().validate('123 456')).toThrowErrorMatchingInlineSnapshot(
    `"Failed to parse value as time value. Value must be a duration in milliseconds, or follow the format <count>[ms|s|m|h|d|w|M|y] (e.g. '70ms', '5s', '3d', '1y', '1m30s'), where the duration is a safe positive integer."`
  );
});
