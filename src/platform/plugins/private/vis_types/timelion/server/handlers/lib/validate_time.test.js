/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import validateTime from './validate_time';

describe('validateTime', () => {
  const tlConfig = { settings: { 'timelion:max_buckets': 2000 } };

  const makeTime = (
    interval,
    from = '2026-01-01T00:00:00.000Z',
    to = '2026-01-02T00:00:00.000Z'
  ) => ({
    from,
    to,
    interval,
  });

  test('accepts a valid interval', () => {
    expect(validateTime(makeTime('1h'), tlConfig)).to.be(true);
  });

  test('accepts a valid interval in minutes', () => {
    expect(validateTime(makeTime('30m'), tlConfig)).to.be(true);
  });

  test('throws on malformed interval that fails to parse', () => {
    expect(() => validateTime(makeTime('.1ms'), tlConfig)).to.throwError(/Invalid interval/);
  });

  test('throws on completely invalid interval string', () => {
    expect(() => validateTime(makeTime('abc'), tlConfig)).to.throwError(/Invalid interval/);
  });

  test('throws on empty string interval', () => {
    expect(() => validateTime(makeTime(''), tlConfig)).to.throwError(/Invalid interval/);
  });

  test('accepts the default "auto" interval', () => {
    expect(validateTime(makeTime('auto'), tlConfig)).to.be(true);
  });

  test('throws when bucket count exceeds max_buckets', () => {
    expect(() => validateTime(makeTime('1s'), tlConfig)).to.throwError(/Max buckets exceeded/);
  });
});
