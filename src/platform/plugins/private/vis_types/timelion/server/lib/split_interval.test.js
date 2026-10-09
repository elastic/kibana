/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import splitInterval from './split_interval';

describe('splitInterval', () => {
  test('parses milliseconds', () => {
    const result = splitInterval('1ms');
    expect(result).to.eql({ count: '1', unit: 'ms' });
  });

  test('parses hours', () => {
    const result = splitInterval('24h');
    expect(result).to.eql({ count: '24', unit: 'h' });
  });

  test('parses days', () => {
    const result = splitInterval('7d');
    expect(result).to.eql({ count: '7', unit: 'd' });
  });

  test('parses months', () => {
    const result = splitInterval('1M');
    expect(result).to.eql({ count: '1', unit: 'M' });
  });

  test('throws on leading-dot malformed interval (.1ms)', () => {
    expect(() => splitInterval('.1ms')).to.throwError(/Malformed `interval`/);
  });

  test('throws on interval with leading characters', () => {
    expect(() => splitInterval('abc1ms')).to.throwError(/Malformed `interval`/);
  });

  test('throws on interval with trailing characters', () => {
    expect(() => splitInterval('1ms!')).to.throwError(/Malformed `interval`/);
  });

  test('throws on empty string', () => {
    expect(() => splitInterval('')).to.throwError(/Malformed `interval`/);
  });

  test('throws on purely alphabetic input', () => {
    expect(() => splitInterval('abc')).to.throwError(/Malformed `interval`/);
  });
});
