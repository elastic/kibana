/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractNanos } from './date_conversion';

describe('function extractNanos', function () {
  test('extract nanos of 2014-01-01', function () {
    expect(extractNanos('2014-01-01')).toBe('000000000');
  });
  test('extract nanos of 2014-01-01T12:12:12.234Z', function () {
    expect(extractNanos('2014-01-01T12:12:12.234Z')).toBe('234000000');
  });
  test('extract nanos of 2014-01-01T12:12:12.234123321Z', function () {
    expect(extractNanos('2014-01-01T12:12:12.234123321Z')).toBe('234123321');
  });
});
