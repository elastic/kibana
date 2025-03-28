/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dateFromString } from './date_from_string';

describe('DateFromString', () => {
  it('parses the string date', () => {
    expect(dateFromString.parse('2012-01-01T12:13:14.123Z')).toEqual(
      new Date('2012-01-01T12:13:14.123Z')
    );
  });

  it.each([['invalid'], ['2025-99-01'], [null], [undefined], [42]])('"%s" should fails', (str) => {
    expect(dateFromString.safeParse(str).success).toBe(false);
  });
});
