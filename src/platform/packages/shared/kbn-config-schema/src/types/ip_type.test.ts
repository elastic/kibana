/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

const { ip } = schema;

describe('ip validation', () => {
  test('accepts ipv4', () => {
    expect(ip().validate('1.1.1.1')).toEqual('1.1.1.1');
  });
  test('accepts ipv6', () => {
    expect(ip().validate('1200:0000:AB00:1234:0000:2552:7777:1313')).toEqual(
      '1200:0000:AB00:1234:0000:2552:7777:1313'
    );
  });
  test('rejects ipv6 when not specified', () => {
    expect(() =>
      ip({ versions: ['ipv4'] }).validate('1200:0000:AB00:1234:0000:2552:7777:1313')
    ).toThrowErrorMatchingInlineSnapshot(`"value must be a valid ipv4 address"`);
  });
  test('rejects ipv4 when not specified', () => {
    expect(() => ip({ versions: ['ipv6'] }).validate('1.1.1.1')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid ipv6 address"`
    );
  });
  test('rejects invalid ip addresses', () => {
    expect(() => ip().validate('1.1.1.1/24')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid ipv4 or ipv6 address"`
    );
    expect(() => ip().validate('99999.1.1.1')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid ipv4 or ipv6 address"`
    );
    expect(() =>
      ip().validate('ZZZZ:0000:AB00:1234:0000:2552:7777:1313')
    ).toThrowErrorMatchingInlineSnapshot(`"value must be a valid ipv4 or ipv6 address"`);
    expect(() => ip().validate('blah 1234')).toThrowErrorMatchingInlineSnapshot(
      `"value must be a valid ipv4 or ipv6 address"`
    );
  });
});

test('returns error when not string', () => {
  expect(() => ip().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]"`
  );

  expect(() => ip().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [Array]"`
  );

  expect(() => ip().validate(/abc/)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [RegExp]"`
  );
});
